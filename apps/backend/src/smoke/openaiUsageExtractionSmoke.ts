import http from "node:http";
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

type SeenRequest = {
  method?: string;
  url?: string;
  body: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
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

function createFakeUpstream(seenRequest: SeenRequest): http.Server {
  return http.createServer((req, res) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      seenRequest.method = req.method;
      seenRequest.url = req.url;
      seenRequest.body = Buffer.concat(chunks).toString("utf8");

      res.statusCode = 207;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(upstreamResponseBody);
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
const originalConsoleLog = console.log;
const consoleLogs: unknown[][] = [];
const seenRequest: SeenRequest = { body: "" };
const fakeUpstream = createFakeUpstream(seenRequest);
const proxyServer = createProxyServer();

console.log = (...args: unknown[]) => {
  consoleLogs.push(args);
  originalConsoleLog(...args);
};

try {
  const upstreamPort = await listen(fakeUpstream);
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${upstreamPort}`;
  delete process.env.OPENAI_API_KEY;

  const proxyPort = await listen(proxyServer);
  const response = await fetch(`http://127.0.0.1:${proxyPort}/openai/v1/chat/completions?source=smoke`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
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

  originalConsoleLog("Usage extraction smoke test passed");
} finally {
  console.log = originalConsoleLog;

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

  await Promise.allSettled([close(proxyServer), close(fakeUpstream)]);
}
