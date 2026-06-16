import type { CalculatedUsageImpact } from "@aei/shared";
import { insertSupabaseRows } from "../db/supabase.js";
import type { OpenAiUsagePayload } from "../proxy/usageExtraction.js";

const MAX_USAGE_LOG_ATTEMPTS = 2;
const USAGE_LOG_RETRY_DELAY_MS = 50;

export type UsageLogInput = OpenAiUsagePayload &
  CalculatedUsageImpact & {
    organizationId: string;
    provider: "openai";
  };

type UsageLogInsertRow = {
  organization_id: string;
  provider: string;
  model: string | null;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  energy_kwh: number;
  co2_grams: number;
  latency_ms: number;
  status_code: number;
};

type UsageLogPersistenceWarning = {
  event: "usage_log_persistence_failed";
  provider: string;
  endpoint: string;
  organization_id: string;
  status_code: number;
  attempt: number;
  max_attempts: number;
  will_retry: boolean;
  error_name: string;
  error_message: string;
};

function toInsertRow(input: UsageLogInput): UsageLogInsertRow {
  return {
    organization_id: input.organizationId,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    input_tokens: input.input_tokens,
    output_tokens: input.output_tokens,
    cost_usd: input.cost_usd,
    energy_kwh: input.energy_kwh,
    co2_grams: input.co2_grams,
    latency_ms: input.latency_ms,
    status_code: input.status_code
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown usage-log persistence error";
}

function toPersistenceWarning(input: UsageLogInput, error: unknown, attempt: number): UsageLogPersistenceWarning {
  return {
    event: "usage_log_persistence_failed",
    provider: input.provider,
    endpoint: input.endpoint,
    organization_id: input.organizationId,
    status_code: input.status_code,
    attempt,
    max_attempts: MAX_USAGE_LOG_ATTEMPTS,
    will_retry: attempt < MAX_USAGE_LOG_ATTEMPTS,
    error_name: getErrorName(error),
    error_message: getErrorMessage(error)
  };
}

export async function logUsage(input: UsageLogInput): Promise<void> {
  const row = toInsertRow(input);

  for (let attempt = 1; attempt <= MAX_USAGE_LOG_ATTEMPTS; attempt += 1) {
    try {
      await insertSupabaseRows("usage_logs", row);
      return;
    } catch (error) {
      console.warn("Usage log persistence failed", toPersistenceWarning(input, error, attempt));

      if (attempt >= MAX_USAGE_LOG_ATTEMPTS) {
        throw error;
      }

      await sleep(USAGE_LOG_RETRY_DELAY_MS);
    }
  }
}
