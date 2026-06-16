import { createHash } from "node:crypto";
import http from "node:http";
import express from "express";
import { openAiProxy } from "../proxy/openaiProxy.js";

const upstreamResponseBody = [
  "{",
  '  "id": "chatcmpl-logging-reliability-smoke",',
  '  "object": "chat.completion",',
  '  "model": "gpt-4.1-mini",',
  '  "choices": [],',
  '  "usage": {',
  '    "prompt_tokens": 17,',
  '    "completion_tokens": 3,',
  '    "total_tokens": 20',
  "  }",
  "}"
].join("\n");

const clientRequestBody = JSON.stringify({
  model: "gpt-4.1-mini",
  messages: [{ role: "user", content: "logging reliability smoke" }]
});
const validClientApiKey = "client-key-logging-reliability-smoke";
const organizationId = "00000000-0000-4000-8000-000000000017";
const validClientApiKeyHash = createHash("sha256").update(validClientApiKey).digest("hex");

type SeenInsert = {
  body: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(condition: () => boolean, message: string): Promise<void> {
  const expiresAt = Date.now() + 1_000;

  while (Date.now() < expiresAt) {
    if (condition()) {
      return;
    }

    await sleep(10);
  }

  throw new Error(message);
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      reject(error);
    };

    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      const address = server.address();
      assert(typeof address === "object" && address !== null, "Server did not expose a TCP address");
      resolve(address.port);
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function createFakeUpstream(): http.Server {
  return http.createServer((_req, res) => {
    res.statusCode = 206;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("x-upstream-logging-reliability-smoke", "passed");
    res.end(upstreamResponseBody);
  });
}

function createFakeSupabase(seenInserts: SeenInsert[]): http.Server {
  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url?.startsWith("/rest/v1/api_keys")) {
      const requestUrl = new URL(req.url, "http://127.0.0.1");

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        requestUrl.searchParams.get("key_hash") === `eq.${validClientApiKeyHash}`
          ? `[{"id":"api-key-id","organization_id":"${organizationId}"}]`
          : "[]"
      );
      return;
    }

    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      if (req.method === "POST" && req.url === "/rest/v1/usage_logs") {
        seenInserts.push({
          body: Buffer.concat(chunks).toString("utf8")
        });

        if (seenInserts.length === 1) {
          res.statusCode = 503;
          res.setHeader("content-type", "application/json");
          res.end('{"message":"temporary fake persistence failure"}');
          return;
        }

        res.statusCode = 201;
        res.end("");
        return;
      }

      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      res.end('{"message":"unexpected fake Supabase request"}');
    });
  });
}

function createProxyServer(): http.Server {
  const app = express();

  app.use(
    "/openai",
    express.raw({
      type: () => true,
      limit: "25mb"
    }),
    openAiProxy
  );

  return http.createServer(app);
}

const previousBaseUrl = process.env.OPENAI_BASE_URL;
const previousApiKey = process.env.OPENAI_API_KEY;
const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalConsoleWarn = console.warn;
const consoleWarnings: unknown[][] = [];
const seenInserts: SeenInsert[] = [];
const fakeUpstream = createFakeUpstream();
const fakeSupabase = createFakeSupabase(seenInserts);
const proxyServer = createProxyServer();

console.warn = (...args: unknown[]) => {
  consoleWarnings.push(args);
};

try {
  const upstreamPort = await listen(fakeUpstream);
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${upstreamPort}`;
  delete process.env.OPENAI_API_KEY;
  const supabasePort = await listen(fakeSupabase);
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabasePort}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const proxyPort = await listen(proxyServer);
  const response = await fetch(
    `http://127.0.0.1:${proxyPort}/openai/v1/chat/completions?source=logging-reliability-smoke`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": validClientApiKey
      },
      body: clientRequestBody
    }
  );
  const responseBody = await response.text();

  assert(response.status === 206, `Expected upstream status 206, received ${response.status}`);
  assert(
    response.headers.get("x-upstream-logging-reliability-smoke") === "passed",
    "Upstream response header was not preserved"
  );
  assert(responseBody === upstreamResponseBody, "Logging retry changed the upstream response body");

  await waitFor(() => seenInserts.length === 2, "Expected one failed insert and one retry insert");
  assert(seenInserts[0].body === seenInserts[1].body, "Retry insert payload changed");

  const insertedUsage = JSON.parse(seenInserts[1].body) as Record<string, unknown>;
  assert(insertedUsage.organization_id === organizationId, "Retry insert organization_id was not set");
  assert(insertedUsage.provider === "openai", "Retry insert provider was not set");
  assert(insertedUsage.endpoint === "/v1/chat/completions", "Retry insert endpoint was not set");
  assert(insertedUsage.status_code === 206, "Retry insert status_code was not set");

  const persistenceWarnings = consoleWarnings.filter((args) => args[0] === "Usage log persistence failed");
  assert(persistenceWarnings.length === 1, `Expected 1 persistence warning, received ${persistenceWarnings.length}`);

  const warning = persistenceWarnings[0]?.[1] as Record<string, unknown> | undefined;
  assert(warning?.event === "usage_log_persistence_failed", "Persistence warning event was not structured");
  assert(warning.provider === "openai", "Persistence warning provider was not set");
  assert(warning.endpoint === "/v1/chat/completions", "Persistence warning endpoint was not set");
  assert(warning.organization_id === organizationId, "Persistence warning organization_id was not set");
  assert(warning.status_code === 206, "Persistence warning status_code was not set");
  assert(warning.attempt === 1, "Persistence warning attempt was not set");
  assert(warning.max_attempts === 2, "Persistence warning max_attempts was not set");
  assert(warning.will_retry === true, "Persistence warning should indicate retry");
  assert(
    typeof warning.error_message === "string" && warning.error_message.includes("503"),
    "Persistence warning should include Supabase response status"
  );

  console.log("Logging reliability smoke test passed");
} finally {
  console.warn = originalConsoleWarn;

  if (previousBaseUrl === undefined) {
    delete process.env.OPENAI_BASE_URL;
  } else {
    process.env.OPENAI_BASE_URL = previousBaseUrl;
  }
  if (previousApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = previousApiKey;
  }
  if (previousSupabaseUrl === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = previousSupabaseUrl;
  }
  if (previousSupabaseServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseServiceRoleKey;
  }

  await Promise.allSettled([close(proxyServer), close(fakeUpstream), close(fakeSupabase)]);
}
