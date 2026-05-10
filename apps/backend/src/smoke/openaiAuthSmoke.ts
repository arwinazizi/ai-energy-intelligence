import { createHash } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import http from "node:http";
import express from "express";
import { openAiProxy } from "../proxy/openaiProxy.js";

const upstreamResponseBody = [
  "{",
  '  "id": "chatcmpl-auth-smoke",',
  '  "object": "chat.completion",',
  '  "model": "gpt-4.1-mini",',
  '  "choices": [],',
  '  "usage": {',
  '    "prompt_tokens": 13,',
  '    "completion_tokens": 5,',
  '    "total_tokens": 18',
  "  }",
  "}"
].join("\n");

const clientRequestBody = JSON.stringify({
  model: "gpt-4.1-mini",
  messages: [{ role: "user", content: "auth smoke" }]
});
const validClientApiKey = "client-key-auth-smoke";
const invalidClientApiKey = "client-key-invalid";
const organizationId = "00000000-0000-4000-8000-000000000001";
const validClientApiKeyHash = createHash("sha256").update(validClientApiKey).digest("hex");
const invalidClientApiKeyHash = createHash("sha256").update(invalidClientApiKey).digest("hex");

type SeenUpstreamRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: string;
};

type SeenSupabaseRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertLength(items: { length: number }, expected: number, message: string): void {
  assert(items.length === expected, `${message}; expected ${expected}, received ${items.length}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

async function assertAuthenticationFailure(response: Response, name: string): Promise<void> {
  assert(response.status === 401, `${name}: expected 401, received ${response.status}`);

  const parsed: unknown = await response.json();
  assert(isObject(parsed), `${name}: expected JSON object response`);
  assert(isObject(parsed.error), `${name}: expected JSON error object`);
  assert(parsed.error.type === "authentication_error", `${name}: expected authentication_error type`);
}

function createFakeUpstream(seenRequests: SeenUpstreamRequest[]): http.Server {
  return http.createServer((req, res) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      seenRequests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8")
      });

      res.statusCode = 202;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("x-upstream-auth-smoke", "passed");
      res.end(upstreamResponseBody);
    });
  });
}

function createFakeSupabase(
  authLookups: SeenSupabaseRequest[],
  usageInserts: SeenSupabaseRequest[],
  validKeyHash: string
): http.Server {
  return http.createServer((req, res) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");

      if (req.method === "GET" && req.url?.startsWith("/rest/v1/api_keys")) {
        const requestUrl = new URL(req.url, "http://127.0.0.1");
        const isValidKey = requestUrl.searchParams.get("key_hash") === `eq.${validKeyHash}`;

        authLookups.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body
        });

        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(isValidKey ? `[{"id":"api-key-id","organization_id":"${organizationId}"}]` : "[]");
        return;
      }

      if (req.method === "POST" && req.url === "/rest/v1/usage_logs") {
        usageInserts.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body
        });

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
const seenUpstreamRequests: SeenUpstreamRequest[] = [];
const seenAuthLookups: SeenSupabaseRequest[] = [];
const seenUsageInserts: SeenSupabaseRequest[] = [];
const fakeUpstream = createFakeUpstream(seenUpstreamRequests);
const fakeSupabase = createFakeSupabase(seenAuthLookups, seenUsageInserts, validClientApiKeyHash);
const proxyServer = createProxyServer();

try {
  const upstreamPort = await listen(fakeUpstream);
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${upstreamPort}`;
  delete process.env.OPENAI_API_KEY;
  const supabasePort = await listen(fakeSupabase);
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabasePort}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const proxyPort = await listen(proxyServer);
  const proxyUrl = `http://127.0.0.1:${proxyPort}/openai/v1/chat/completions?source=auth-smoke`;

  const missingKeyResponse = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: clientRequestBody
  });

  await assertAuthenticationFailure(missingKeyResponse, "missing x-api-key");
  assertLength(seenAuthLookups, 0, "Missing x-api-key should not query Supabase");
  assertLength(seenUpstreamRequests, 0, "Missing x-api-key should not hit upstream");

  const invalidKeyResponse = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": invalidClientApiKey
    },
    body: clientRequestBody
  });

  await assertAuthenticationFailure(invalidKeyResponse, "invalid x-api-key");
  assertLength(seenAuthLookups, 1, "Invalid x-api-key should query Supabase once");
  assert(
    seenAuthLookups[0].url?.includes(`key_hash=eq.${invalidClientApiKeyHash}`),
    "Invalid x-api-key lookup did not use the hashed client key"
  );
  assertLength(seenUpstreamRequests, 0, "Invalid x-api-key should not hit upstream");

  const validKeyResponse = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": validClientApiKey
    },
    body: clientRequestBody
  });
  const validKeyResponseBody = await validKeyResponse.text();

  assert(validKeyResponse.status === 202, `Valid x-api-key expected upstream status 202, received ${validKeyResponse.status}`);
  assert(validKeyResponse.headers.get("x-upstream-auth-smoke") === "passed", "Upstream response header was not preserved");
  assert(validKeyResponseBody === upstreamResponseBody, "Authorized proxy response body changed from upstream body");
  assertLength(seenAuthLookups, 2, "Valid x-api-key should query Supabase once");
  assert(
    seenAuthLookups[1].url?.includes(`key_hash=eq.${validClientApiKeyHash}`),
    "Valid x-api-key lookup did not use the hashed client key"
  );
  assertLength(seenUpstreamRequests, 1, "Valid x-api-key should hit upstream once");

  const upstreamRequest = seenUpstreamRequests[0];
  assert(upstreamRequest.method === "POST", `Expected upstream POST, received ${upstreamRequest.method}`);
  assert(
    upstreamRequest.url === "/v1/chat/completions?source=auth-smoke",
    `Expected upstream path/query to be preserved, received ${upstreamRequest.url}`
  );
  assert(upstreamRequest.body === clientRequestBody, "Proxy request body changed before reaching upstream");
  assert(!("x-api-key" in upstreamRequest.headers), "Client x-api-key should not be forwarded upstream");

  for (const lookup of seenAuthLookups) {
    assert(lookup.headers.apikey === "service-role-key", "Supabase auth lookup apikey header was not sent");
    assert(
      lookup.headers.authorization === "Bearer service-role-key",
      "Supabase auth lookup authorization header was not sent"
    );
  }

  await waitFor(() => seenUsageInserts.length === 1, "Expected authorized usage payload to be inserted");
  const usageInsert = seenUsageInserts[0];
  assert(usageInsert.headers.apikey === "service-role-key", "Supabase usage insert apikey header was not sent");
  assert(
    usageInsert.headers.authorization === "Bearer service-role-key",
    "Supabase usage insert authorization header was not sent"
  );

  const insertedUsage = JSON.parse(usageInsert.body) as Record<string, unknown>;
  assert(insertedUsage.organization_id === organizationId, "Authorized usage insert organization_id was not set");
  assert(insertedUsage.provider === "openai", "Authorized usage insert provider was not set");
  assert(insertedUsage.endpoint === "/v1/chat/completions", "Authorized usage insert endpoint was not set");
  assert(insertedUsage.status_code === 202, "Authorized usage insert status_code was not set");
  assert(insertedUsage.input_tokens === 13, "Authorized usage insert input_tokens was not set");
  assert(insertedUsage.output_tokens === 5, "Authorized usage insert output_tokens was not set");

  console.log("API key auth smoke test passed");
} finally {
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
