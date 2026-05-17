import { createHash } from "node:crypto";
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

const organizationId = "00000000-0000-4000-8000-000000000001";
const otherOrganizationId = "00000000-0000-4000-8000-000000000002";
const validClientApiKey = "csv-export-smoke-client-key";
const invalidClientApiKey = "csv-export-smoke-invalid-key";
const validClientApiKeyHash = createHash("sha256").update(validClientApiKey).digest("hex");
const invalidClientApiKeyHash = createHash("sha256").update(invalidClientApiKey).digest("hex");

const olderUsageRow: UsageLogRow = {
  organization_id: organizationId,
  provider: "openai",
  model: 'gpt-4.1 "mini", test',
  endpoint: "/v1/chat\r\ncompletions",
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
  organization_id: organizationId,
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
const otherTenantUsageRow: UsageLogRow = {
  organization_id: otherOrganizationId,
  provider: "openai",
  model: "gpt-4.1-mini",
  endpoint: "/v1/chat/completions",
  input_tokens: 999,
  output_tokens: 999,
  total_tokens: 1998,
  cost_usd: 99,
  energy_kwh: 99,
  co2_grams: 99,
  latency_ms: 999,
  status_code: 200,
  created_at: "2026-04-28T12:00:00.000Z"
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function assertAuthenticationFailure(response: Response, name: string): Promise<void> {
  assert(response.status === 401, `${name}: expected 401, received ${response.status}`);
  const body: unknown = await response.json();
  assert(isObject(body), `${name}: expected JSON object response`);
  assert(isObject(body.error), `${name}: expected JSON error object`);
  assert(body.error.type === "authentication_error", `${name}: expected authentication_error type`);
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
    if (req.method !== "GET" || (!req.url?.startsWith("/rest/v1/api_keys") && !req.url?.startsWith("/rest/v1/usage_logs"))) {
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
    if (req.url.startsWith("/rest/v1/api_keys")) {
      const isValidKey = requestUrl.searchParams.get("key_hash") === `eq.${validClientApiKeyHash}`;

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(isValidKey ? `[{"id":"api-key-id","organization_id":"${organizationId}"}]` : "[]");
      return;
    }

    const order = requestUrl.searchParams.get("order");
    const limit = requestUrl.searchParams.get("limit");
    const organizationFilter = requestUrl.searchParams.get("organization_id");
    let responseRows = getRows().filter((row) => `eq.${String(row.organization_id)}` === organizationFilter);

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

function fetchCsv(url: string, apiKey?: string): Promise<Response> {
  const headers = apiKey ? { "x-api-key": apiKey } : undefined;
  return fetch(url, { headers });
}

const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seenSupabaseRequests: SeenSupabaseRequest[] = [];
const usageRows = [olderUsageRow, newerUsageRow, otherTenantUsageRow];
const fakeSupabase = createFakeSupabase(seenSupabaseRequests, () => usageRows);
const apiServer = createApiServer();

try {
  const supabasePort = await listen(fakeSupabase);
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabasePort}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const apiPort = await listen(apiServer);
  const csvUrl = `http://127.0.0.1:${apiPort}/api/usage.csv`;

  const missingKeyExport = await fetchCsv(csvUrl);
  await assertAuthenticationFailure(missingKeyExport, "missing export x-api-key");
  assert(
    !seenSupabaseRequests.some((request) => request.url?.startsWith("/rest/v1/usage_logs")),
    "Missing x-api-key should not query usage_logs"
  );

  const invalidKeyExport = await fetchCsv(csvUrl, invalidClientApiKey);
  await assertAuthenticationFailure(invalidKeyExport, "invalid export x-api-key");
  assert(
    seenSupabaseRequests.some((request) => request.url?.includes(`key_hash=eq.${invalidClientApiKeyHash}`)),
    "Invalid x-api-key lookup did not use the hashed client key"
  );

  const validExport = await fetchCsv(csvUrl, validClientApiKey);
  assert(validExport.status === 200, `Valid export expected 200, received ${validExport.status}`);
  assert(
    validExport.headers.get("content-type")?.startsWith("text/csv"),
    "Valid export should return text/csv"
  );
  assert(
    validExport.headers.get("content-disposition") === 'attachment; filename="aei-usage-export.csv"',
    "Valid export should set a CSV attachment filename"
  );
  assert(validExport.headers.get("cache-control") === "no-store", "Valid export should disable caching");

  const csv = await validExport.text();
  const expectedCsv = [
    "created_at,provider,model,endpoint,input_tokens,output_tokens,total_tokens,cost_usd,energy_kwh,co2_grams,latency_ms,status_code",
    "2026-04-28T11:00:00.000Z,openai,,/v1/responses,5,3,8,0.0000041,0.0000024,0.00096,,200",
    '2026-04-28T10:00:00.000Z,openai,"gpt-4.1 ""mini"", test","/v1/chat\r\ncompletions",11,7,18,0.0000156,0.0000054,0.00216,123,207',
    ""
  ].join("\r\n");

  assert(csv === expectedCsv, "Valid export CSV content or escaping was wrong");
  assert(!csv.includes("999"), "Valid export should not include another tenant's rows");

  const exportRequest = seenSupabaseRequests.find((request) => request.url?.includes("order=created_at.desc"));
  assert(exportRequest, "CSV export should request created_at descending order from Supabase");
  assert(exportRequest.url?.includes("limit=1000"), "CSV export should request the bounded export limit");
  assert(
    exportRequest.url?.includes(`organization_id=eq.${organizationId}`),
    "CSV export should filter rows by organization_id"
  );

  for (const request of seenSupabaseRequests) {
    assert(request.headers.apikey === "service-role-key", "Supabase apikey header was not sent");
    assert(request.headers.authorization === "Bearer service-role-key", "Supabase authorization header was not sent");
  }

  console.log("CSV export smoke test passed");
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
