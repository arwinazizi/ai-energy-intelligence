import http from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import express from "express";
import { summaryApi } from "../api/summary.js";

type UsageLogRow = Record<string, unknown>;

type SeenSupabaseRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
};

const olderUsageRow: UsageLogRow = {
  provider: "openai",
  model: "gpt-4.1-mini",
  endpoint: "/v1/chat/completions",
  input_tokens: "11",
  output_tokens: "7",
  total_tokens: "18",
  cost_usd: "0.0000156",
  energy_kwh: "0.0000054",
  co2_grams: "0.00216",
  latency_ms: 123,
  status_code: 207,
  created_at: "2026-04-28T10:00:00.000Z"
};
const newerUsageRow: UsageLogRow = {
  provider: "openai",
  model: null,
  endpoint: "/v1/responses",
  input_tokens: 5,
  output_tokens: 3,
  total_tokens: 8,
  cost_usd: 0.0000041,
  energy_kwh: 0.0000024,
  co2_grams: 0.00096,
  latency_ms: null,
  status_code: 200,
  created_at: "2026-04-28T11:00:00.000Z"
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function createFakeSupabase(seenRequests: SeenSupabaseRequest[], getRows: () => UsageLogRow[]): http.Server {
  return http.createServer((req, res) => {
    if (req.method !== "GET" || !req.url?.startsWith("/rest/v1/usage_logs")) {
      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      res.end('{"message":"unexpected fake Supabase request"}');
      return;
    }

    seenRequests.push({
      method: req.method,
      url: req.url,
      headers: req.headers
    });

    const requestUrl = new URL(req.url, "http://127.0.0.1");
    const order = requestUrl.searchParams.get("order");
    const limit = requestUrl.searchParams.get("limit");
    let responseRows = [...getRows()];

    if (order === "created_at.desc") {
      responseRows = responseRows.sort((left, right) =>
        String(right.created_at).localeCompare(String(left.created_at))
      );
    }

    if (limit) {
      responseRows = responseRows.slice(0, Number(limit));
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(responseRows));
  });
}

function createApiServer(): http.Server {
  const app = express();

  app.use("/api", summaryApi);

  return http.createServer(app);
}

async function readJson(url: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url);

  return {
    status: response.status,
    body: await response.json()
  };
}

const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seenSupabaseRequests: SeenSupabaseRequest[] = [];
let usageRows: UsageLogRow[] = [];
const fakeSupabase = createFakeSupabase(seenSupabaseRequests, () => usageRows);
const apiServer = createApiServer();

try {
  const supabasePort = await listen(fakeSupabase);
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabasePort}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const apiPort = await listen(apiServer);
  const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;

  const emptySummary = await readJson(`${apiBaseUrl}/summary`);
  assert(emptySummary.status === 200, `Empty summary expected 200, received ${emptySummary.status}`);
  assert(isObject(emptySummary.body), "Empty summary response should be a JSON object");
  assert(emptySummary.body.request_count === 0, "Empty summary request_count should be zero");
  assert(emptySummary.body.input_tokens === 0, "Empty summary input_tokens should be zero");
  assert(emptySummary.body.output_tokens === 0, "Empty summary output_tokens should be zero");
  assert(emptySummary.body.total_tokens === 0, "Empty summary total_tokens should be zero");
  assert(emptySummary.body.cost_usd === 0, "Empty summary cost_usd should be zero");
  assert(emptySummary.body.energy_kwh === 0, "Empty summary energy_kwh should be zero");
  assert(emptySummary.body.co2_grams === 0, "Empty summary co2_grams should be zero");

  const emptyRecent = await readJson(`${apiBaseUrl}/recent`);
  assert(emptyRecent.status === 200, `Empty recent expected 200, received ${emptyRecent.status}`);
  assert(isObject(emptyRecent.body), "Empty recent response should be a JSON object");
  assert(Array.isArray(emptyRecent.body.items), "Empty recent items should be an array");
  assert(emptyRecent.body.items.length === 0, "Empty recent items should be empty");

  usageRows = [olderUsageRow, newerUsageRow];

  const populatedSummary = await readJson(`${apiBaseUrl}/summary`);
  assert(populatedSummary.status === 200, `Populated summary expected 200, received ${populatedSummary.status}`);
  assert(isObject(populatedSummary.body), "Populated summary response should be a JSON object");
  assert(populatedSummary.body.request_count === 2, "Populated summary request_count should include both rows");
  assert(populatedSummary.body.input_tokens === 16, "Populated summary input_tokens total is wrong");
  assert(populatedSummary.body.output_tokens === 10, "Populated summary output_tokens total is wrong");
  assert(populatedSummary.body.total_tokens === 26, "Populated summary total_tokens total is wrong");
  assertNear(populatedSummary.body.cost_usd, 0.0000197, "Populated summary cost_usd total is wrong");
  assertNear(populatedSummary.body.energy_kwh, 0.0000078, "Populated summary energy_kwh total is wrong");
  assertNear(populatedSummary.body.co2_grams, 0.00312, "Populated summary co2_grams total is wrong");

  const populatedRecent = await readJson(`${apiBaseUrl}/recent`);
  assert(populatedRecent.status === 200, `Populated recent expected 200, received ${populatedRecent.status}`);
  assert(isObject(populatedRecent.body), "Populated recent response should be a JSON object");
  assert(Array.isArray(populatedRecent.body.items), "Populated recent items should be an array");
  assert(populatedRecent.body.items.length === 2, "Populated recent should include both fake rows");

  const [firstRecent, secondRecent] = populatedRecent.body.items as Record<string, unknown>[];
  assert(firstRecent.created_at === newerUsageRow.created_at, "Recent rows should be ordered newest first");
  assert(firstRecent.provider === "openai", "Recent provider was not returned");
  assert(firstRecent.model === null, "Recent null model was not preserved");
  assert(firstRecent.endpoint === "/v1/responses", "Recent endpoint was not returned");
  assert(firstRecent.input_tokens === 5, "Recent input_tokens was not returned as a number");
  assert(firstRecent.output_tokens === 3, "Recent output_tokens was not returned as a number");
  assert(firstRecent.total_tokens === 8, "Recent total_tokens was not returned as a number");
  assertNear(firstRecent.cost_usd, 0.0000041, "Recent cost_usd was not returned as a number");
  assertNear(firstRecent.energy_kwh, 0.0000024, "Recent energy_kwh was not returned as a number");
  assertNear(firstRecent.co2_grams, 0.00096, "Recent co2_grams was not returned as a number");
  assert(firstRecent.latency_ms === null, "Recent null latency_ms was not preserved");
  assert(firstRecent.status_code === 200, "Recent status_code was not returned");
  assert(secondRecent.created_at === olderUsageRow.created_at, "Older row should be second");

  const recentRequest = seenSupabaseRequests.find((request) => request.url?.includes("order=created_at.desc"));
  assert(recentRequest, "Recent API should request created_at descending order from Supabase");
  assert(recentRequest.url?.includes("limit=10"), "Recent API should request the V1 limit from Supabase");

  for (const request of seenSupabaseRequests) {
    assert(request.headers.apikey === "service-role-key", "Supabase apikey header was not sent");
    assert(request.headers.authorization === "Bearer service-role-key", "Supabase authorization header was not sent");
  }

  console.log("Summary API smoke test passed");
} finally {
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

  await Promise.allSettled([close(apiServer), close(fakeSupabase)]);
}
