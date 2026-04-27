import type { CalculatedUsageImpact } from "@aei/shared";
import { insertSupabaseRows } from "../db/supabase.js";
import type { OpenAiUsagePayload } from "../proxy/usageExtraction.js";

export type UsageLogInput = OpenAiUsagePayload &
  CalculatedUsageImpact & {
    provider: "openai";
  };

type UsageLogInsertRow = {
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

function toInsertRow(input: UsageLogInput): UsageLogInsertRow {
  return {
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

export async function logUsage(input: UsageLogInput): Promise<void> {
  await insertSupabaseRows("usage_logs", toInsertRow(input));
}
