import { createHash } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import http from "node:http";
import { TextDecoder } from "node:util";
import express from "express";
import { openAiProxy } from "../proxy/openaiProxy.js";

const upstreamResponseBody = [
  "{",
  '  "id": "chatcmpl-smoke",',
  '  "object": "chat.completion",',
  '  "model": "gpt-4.1-mini",',
  '  "choices": [],',
  '  "usage": {',
  '    "prompt_tokens": 11,',
  '    "completion_tokens": 7,',
  '    "total_tokens": 18',
  "  }",
  "}"
].join("\n");

const clientRequestBody = JSON.stringify({
  model: "gpt-4.1-mini",
  messages: [{ role: "user", content: "smoke" }]
});
const streamingClientRequestBody = JSON.stringify({
  model: "gpt-4.1-mini",
  messages: [{ role: "user", content: "stream smoke" }],
  stream: true
});
const sseFirstChunk = 'data: {"delta":"first"}\n\n';
const sseSecondChunk = 'data: {"delta":"second"}\n\n';
const validClientApiKey = "client-key-smoke";
const validClientApiKeyHash = createHash("sha256").update(validClientApiKey).digest("hex");

type SeenRequest = {
  method?: string;
  url?: string;
  body: string;
};

type SeenSupabaseInsert = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: string;
};

type StreamingState = {
  ended: boolean;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNear(actual: unknown, expected: number, message: string): void {
  assert(typeof actual === "number", message);
  assert(Math.abs(actual - expected) < 0.000000000001, message);
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

function createFakeUpstream(seenRequest: SeenRequest, streamingState: StreamingState): http.Server {
  return http.createServer((req, res) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      seenRequest.method = req.method;
      seenRequest.url = req.url;
      seenRequest.body = Buffer.concat(chunks).toString("utf8");

      if (req.url?.includes("source=sse-smoke")) {
        res.statusCode = 208;
        res.setHeader("content-type", "text/event-stream");
        res.setHeader("x-upstream-stream-smoke", "passed");
        res.write(sseFirstChunk);

        setTimeout(() => {
          res.write(sseSecondChunk);
          streamingState.ended = true;
          res.end();
        }, 75);
        return;
      }

      res.statusCode = 207;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(upstreamResponseBody);
    });
  });
}

function createFakeSupabase(
  seenInserts: SeenSupabaseInsert[],
  validKeyHash: string,
  getStatusCode: () => number,
  getResponseBody: () => string
): http.Server {
  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url?.startsWith("/rest/v1/api_keys")) {
      const requestUrl = new URL(req.url, "http://127.0.0.1");

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(requestUrl.searchParams.get("key_hash") === `eq.${validKeyHash}` ? '[{"id":"api-key-id"}]' : "[]");
      return;
    }

    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      seenInserts.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8")
      });

      res.statusCode = getStatusCode();
      res.setHeader("content-type", "application/json");
      res.end(getResponseBody());
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
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const consoleLogs: unknown[][] = [];
const consoleWarnings: unknown[][] = [];
const seenRequest: SeenRequest = { body: "" };
const seenSupabaseInserts: SeenSupabaseInsert[] = [];
const streamingState: StreamingState = { ended: false };
let supabaseStatusCode = 201;
let supabaseResponseBody = "";
const fakeUpstream = createFakeUpstream(seenRequest, streamingState);
const fakeSupabase = createFakeSupabase(
  seenSupabaseInserts,
  validClientApiKeyHash,
  () => supabaseStatusCode,
  () => supabaseResponseBody
);
const proxyServer = createProxyServer();

console.log = (...args: unknown[]) => {
  consoleLogs.push(args);
  originalConsoleLog(...args);
};

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
  const response = await fetch(`http://127.0.0.1:${proxyPort}/openai/v1/chat/completions?source=smoke`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": validClientApiKey
    },
    body: clientRequestBody
  });
  const responseBody = await response.text();

  assert(response.status === 207, `Expected upstream status 207, received ${response.status}`);
  assert(responseBody === upstreamResponseBody, "Proxy response body changed from upstream body");
  assert(seenRequest.method === "POST", `Expected upstream POST, received ${seenRequest.method}`);
  assert(
    seenRequest.url === "/v1/chat/completions?source=smoke",
    `Expected upstream path/query to be preserved, received ${seenRequest.url}`
  );
  assert(seenRequest.body === clientRequestBody, "Proxy request body changed before reaching upstream");

  const usageLog = consoleLogs.find((args) => args[0] === "OpenAI usage extracted");
  assert(usageLog, "Expected proxy to log extracted usage payload");

  const usagePayload = usageLog[1] as Record<string, unknown>;
  assert(usagePayload.endpoint === "/v1/chat/completions", "Usage payload endpoint was not extracted");
  assert(usagePayload.status_code === 207, "Usage payload status_code was not extracted");
  assert(typeof usagePayload.latency_ms === "number", "Usage payload latency_ms was not measured");
  assert(usagePayload.model === "gpt-4.1-mini", "Usage payload model was not extracted");
  assert(usagePayload.input_tokens === 11, "Usage payload input_tokens was not extracted");
  assert(usagePayload.output_tokens === 7, "Usage payload output_tokens was not extracted");
  assert(usagePayload.total_tokens === 18, "Usage payload total_tokens was not extracted");
  assertNear(usagePayload.cost_usd, 0.0000156, "Usage payload cost_usd was not calculated");
  assertNear(usagePayload.energy_kwh, 0.0000054, "Usage payload energy_kwh was not calculated");
  assertNear(usagePayload.co2_grams, 0.00216, "Usage payload co2_grams was not calculated");

  await waitFor(() => seenSupabaseInserts.length === 1, "Expected usage payload to be inserted into Supabase");
  const usageInsert = seenSupabaseInserts[0];
  assert(usageInsert.method === "POST", `Expected Supabase POST, received ${usageInsert.method}`);
  assert(
    usageInsert.url === "/rest/v1/usage_logs",
    `Expected Supabase usage_logs insert URL, received ${usageInsert.url}`
  );
  assert(usageInsert.headers.apikey === "service-role-key", "Supabase apikey header was not sent");
  assert(
    usageInsert.headers.authorization === "Bearer service-role-key",
    "Supabase authorization header was not sent"
  );
  assert(usageInsert.headers.prefer === "return=minimal", "Supabase prefer header was not sent");

  const insertedUsage = JSON.parse(usageInsert.body) as Record<string, unknown>;
  assert(insertedUsage.provider === "openai", "Supabase payload provider was not set");
  assert(insertedUsage.endpoint === "/v1/chat/completions", "Supabase payload endpoint was not set");
  assert(insertedUsage.status_code === 207, "Supabase payload status_code was not set");
  assert(typeof insertedUsage.latency_ms === "number", "Supabase payload latency_ms was not set");
  assert(insertedUsage.model === "gpt-4.1-mini", "Supabase payload model was not set");
  assert(insertedUsage.input_tokens === 11, "Supabase payload input_tokens was not set");
  assert(insertedUsage.output_tokens === 7, "Supabase payload output_tokens was not set");
  assert(!("total_tokens" in insertedUsage), "Supabase payload should let the generated total_tokens column compute");
  assertNear(insertedUsage.cost_usd, 0.0000156, "Supabase payload cost_usd was not set");
  assertNear(insertedUsage.energy_kwh, 0.0000054, "Supabase payload energy_kwh was not set");
  assertNear(insertedUsage.co2_grams, 0.00216, "Supabase payload co2_grams was not set");

  supabaseStatusCode = 500;
  supabaseResponseBody = '{"message":"fake persistence failure"}';

  const failureResponse = await fetch(
    `http://127.0.0.1:${proxyPort}/openai/v1/chat/completions?source=smoke-failure`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": validClientApiKey
      },
      body: clientRequestBody
    }
  );
  const failureResponseBody = await failureResponse.text();

  assert(failureResponse.status === 207, `Expected upstream status after logging failure, received ${failureResponse.status}`);
  assert(failureResponseBody === upstreamResponseBody, "Logging failure changed the upstream response body");
  await waitFor(() => seenSupabaseInserts.length === 2, "Expected failed usage insert attempt");
  await waitFor(
    () => consoleWarnings.some((args) => args[0] === "OpenAI usage persistence failed"),
    "Expected logging failure to be console-warned"
  );
  const persistenceWarning = consoleWarnings.find((args) => args[0] === "OpenAI usage persistence failed");
  assert(persistenceWarning?.[1] instanceof Error, "Expected persistence warning to include an Error");
  assert(
    (persistenceWarning[1] as Error).message.includes("500"),
    "Expected persistence warning to include Supabase response status"
  );

  const usageLogCountBeforeStream = consoleLogs.filter((args) => args[0] === "OpenAI usage extracted").length;
  const usageInsertCountBeforeStream = seenSupabaseInserts.length;
  const streamResponse = await fetch(
    `http://127.0.0.1:${proxyPort}/openai/v1/chat/completions?source=sse-smoke`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": validClientApiKey
      },
      body: streamingClientRequestBody
    }
  );

  assert(streamResponse.status === 208, `Expected streaming upstream status 208, received ${streamResponse.status}`);
  assert(
    streamResponse.headers.get("content-type") === "text/event-stream",
    "Streaming content-type header was not preserved"
  );
  assert(
    streamResponse.headers.get("x-upstream-stream-smoke") === "passed",
    "Streaming upstream header was not preserved"
  );
  assert(streamResponse.body, "Expected streaming response body");

  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder();
  const firstRead = await reader.read();
  assert(!firstRead.done, "Expected first streaming chunk before stream completion");

  const firstChunk = decoder.decode(firstRead.value, { stream: true });
  assert(firstChunk === sseFirstChunk, "First streaming chunk was not forwarded unchanged");
  assert(!streamingState.ended, "First streaming chunk was not forwarded before upstream stream ended");

  let streamedBody = firstChunk;
  while (true) {
    const nextRead = await reader.read();

    if (nextRead.done) {
      streamedBody += decoder.decode();
      break;
    }

    streamedBody += decoder.decode(nextRead.value, { stream: true });
  }

  assert(streamingState.ended, "Expected fake upstream streaming response to end");
  assert(streamedBody === `${sseFirstChunk}${sseSecondChunk}`, "Streaming response body changed");
  await sleep(50);
  assert(
    consoleLogs.filter((args) => args[0] === "OpenAI usage extracted").length === usageLogCountBeforeStream,
    "Streaming response should not produce a usage extraction log"
  );
  assert(
    seenSupabaseInserts.length === usageInsertCountBeforeStream,
    "Streaming response should not insert a Supabase usage log"
  );

  originalConsoleLog("Usage extraction smoke test passed");
} finally {
  console.log = originalConsoleLog;
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
