import type { IncomingHttpHeaders } from "node:http";

type JsonObject = Record<string, unknown>;

export type OpenAiUsagePayload = {
  endpoint: string;
  status_code: number;
  latency_ms: number;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

type ExtractionInput = {
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isJsonResponse(headers: IncomingHttpHeaders): boolean {
  const contentType = headers["content-type"];
  const values = Array.isArray(contentType) ? contentType : [contentType];

  return values.some((value) => typeof value === "string" && value.toLowerCase().includes("json"));
}

function parseJsonObject(body: Buffer): JsonObject | undefined {
  if (body.length === 0) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(body.toString("utf8"));
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function extractOpenAiUsagePayload(input: ExtractionInput): OpenAiUsagePayload | undefined {
  if (!isJsonResponse(input.headers)) {
    return undefined;
  }

  const parsed = parseJsonObject(input.body);
  if (!parsed || !isObject(parsed.usage)) {
    return undefined;
  }

  const inputTokens =
    asFiniteNumber(parsed.usage.input_tokens) ?? asFiniteNumber(parsed.usage.prompt_tokens);
  const totalTokens = asFiniteNumber(parsed.usage.total_tokens);
  const outputTokens =
    asFiniteNumber(parsed.usage.output_tokens) ??
    asFiniteNumber(parsed.usage.completion_tokens) ??
    (inputTokens !== undefined && totalTokens !== undefined ? totalTokens - inputTokens : undefined);

  const normalizedTotalTokens =
    totalTokens ?? (inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined);

  if (inputTokens === undefined || outputTokens === undefined || normalizedTotalTokens === undefined) {
    return undefined;
  }

  return {
    endpoint: input.endpoint,
    status_code: input.statusCode,
    latency_ms: input.latencyMs,
    model: typeof parsed.model === "string" ? parsed.model : null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: normalizedTotalTokens
  };
}
