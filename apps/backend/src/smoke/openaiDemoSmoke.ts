import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import type { RecentUsageLogDto, RecentUsageLogsResponseDto, UsageSummaryDto } from "@aei/shared";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:4000";
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_PROMPT = "Reply with one short sentence: AEI V1 demo smoke test.";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEMO_ENDPOINT = "/v1/chat/completions";

for (const envFile of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", "..", ".env")]) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
    break;
  }
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readRequiredEnv(name: string): string {
  const value = readOptionalEnv(name);

  if (!value) {
    throw new Error(`${name} is required for the live demo smoke`);
  }

  return value;
}

function getApiBaseUrl(): string {
  return (readOptionalEnv("AEI_API_BASE_URL") || readOptionalEnv("VITE_API_BASE_URL") || DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    ""
  );
}

function getTimeoutMs(): number {
  const configuredTimeout = Number(readOptionalEnv("AEI_DEMO_TIMEOUT_MS"));
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : DEFAULT_TIMEOUT_MS;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumberField(value: Record<string, unknown>, name: string): number {
  const field = value[name];

  if (typeof field === "number" && Number.isFinite(field)) {
    return field;
  }

  throw new Error(`OpenAI response usage.${name} was not a finite number`);
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function readJson<T>(apiBaseUrl: string, path: string, clientApiKey: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      accept: "application/json",
      "x-api-key": clientApiKey
    }
  });

  if (!response.ok) {
    const body = await readResponseText(response);
    const detail = body ? `: ${body.slice(0, 500)}` : "";

    throw new Error(`${path} failed with ${response.status} ${response.statusText}${detail}`);
  }

  return response.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForSummaryIncrease(
  apiBaseUrl: string,
  clientApiKey: string,
  minimumRequestCount: number,
  timeoutMs: number
): Promise<UsageSummaryDto> {
  const expiresAt = Date.now() + timeoutMs;
  let lastSummary: UsageSummaryDto | null = null;

  while (Date.now() < expiresAt) {
    lastSummary = await readJson<UsageSummaryDto>(apiBaseUrl, "/api/summary", clientApiKey);

    if (lastSummary.request_count >= minimumRequestCount) {
      return lastSummary;
    }

    await sleep(500);
  }

  const lastCount = lastSummary ? lastSummary.request_count : "unavailable";
  throw new Error(
    `Timed out waiting for /api/summary request_count to reach ${minimumRequestCount}; last count was ${lastCount}`
  );
}

function validateRecentRow(row: RecentUsageLogDto, expected: { model: string; statusCode: number; totalTokens: number }): void {
  assert(row.provider === "openai", `Expected newest recent row provider openai, received ${row.provider}`);
  assert(row.endpoint === DEMO_ENDPOINT, `Expected newest recent row endpoint ${DEMO_ENDPOINT}, received ${row.endpoint}`);
  assert(row.model === expected.model, `Expected newest recent row model ${expected.model}, received ${row.model ?? "null"}`);
  assert(
    row.status_code === expected.statusCode,
    `Expected newest recent row status ${expected.statusCode}, received ${row.status_code}`
  );
  assert(
    row.total_tokens === expected.totalTokens,
    `Expected newest recent row total_tokens ${expected.totalTokens}, received ${row.total_tokens}`
  );
}

const apiBaseUrl = getApiBaseUrl();
const clientApiKey = readRequiredEnv("AEI_CLIENT_API_KEY");
const model = readOptionalEnv("AEI_DEMO_MODEL") || DEFAULT_MODEL;
const prompt = readOptionalEnv("AEI_DEMO_PROMPT") || DEFAULT_PROMPT;
const timeoutMs = getTimeoutMs();

const beforeSummary = await readJson<UsageSummaryDto>(apiBaseUrl, "/api/summary", clientApiKey);
const response = await fetch(`${apiBaseUrl}/openai${DEMO_ENDPOINT}`, {
  method: "POST",
  headers: {
    "accept-encoding": "identity",
    "content-type": "application/json",
    "x-api-key": clientApiKey
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    stream: false
  })
});
const responseBody = await readResponseText(response);

if (!response.ok) {
  const detail = responseBody ? `: ${responseBody.slice(0, 1_000)}` : "";
  throw new Error(`OpenAI proxy request failed with ${response.status} ${response.statusText}${detail}`);
}

let parsedResponse: unknown;
try {
  parsedResponse = JSON.parse(responseBody);
} catch {
  throw new Error("OpenAI proxy response was not valid JSON");
}

assert(isObject(parsedResponse), "OpenAI proxy response was not a JSON object");
assert(isObject(parsedResponse.usage), "OpenAI proxy response did not include a usage object");

const responseModel = typeof parsedResponse.model === "string" ? parsedResponse.model : model;
const totalTokens = getNumberField(parsedResponse.usage, "total_tokens");
const afterSummary = await waitForSummaryIncrease(apiBaseUrl, clientApiKey, beforeSummary.request_count + 1, timeoutMs);
const recent = await readJson<RecentUsageLogsResponseDto>(apiBaseUrl, "/api/recent", clientApiKey);
const newestRow = recent.items[0];

assert(newestRow, "/api/recent returned no rows after /api/summary increased");
validateRecentRow(newestRow, {
  model: responseModel,
  statusCode: response.status,
  totalTokens
});

console.log("AEI-009 live demo smoke passed");
console.log(`API base URL: ${apiBaseUrl}`);
console.log(`Summary request_count: ${beforeSummary.request_count} -> ${afterSummary.request_count}`);
console.log(
  `Newest recent row: provider=${newestRow.provider} model=${newestRow.model ?? "n/a"} endpoint=${newestRow.endpoint} tokens=${newestRow.total_tokens}`
);
