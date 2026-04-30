import type { Request, Response } from "express";
import { Router } from "express";
import type { RecentUsageLogDto, RecentUsageLogsResponseDto, UsageSummaryDto } from "@aei/shared";
import { selectSupabaseRows } from "../db/supabase.js";

const SUMMARY_SELECT = "input_tokens,output_tokens,total_tokens,cost_usd,energy_kwh,co2_grams";
const RECENT_SELECT = [
  "provider",
  "model",
  "endpoint",
  "input_tokens",
  "output_tokens",
  "total_tokens",
  "cost_usd",
  "energy_kwh",
  "co2_grams",
  "latency_ms",
  "status_code",
  "created_at"
].join(",");
const RECENT_LIMIT = 10;

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toInteger(value: unknown): number {
  return Math.trunc(toNumber(value));
}

function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return toInteger(value);
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function emptySummary(): UsageSummaryDto {
  return {
    request_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    energy_kwh: 0,
    co2_grams: 0
  };
}

function summarizeRows(rows: Record<string, unknown>[]): UsageSummaryDto {
  const summary = rows.reduce<UsageSummaryDto>((totals, row) => {
    totals.request_count += 1;
    totals.input_tokens += toInteger(row.input_tokens);
    totals.output_tokens += toInteger(row.output_tokens);
    totals.total_tokens += toInteger(row.total_tokens);
    totals.cost_usd += toNumber(row.cost_usd);
    totals.energy_kwh += toNumber(row.energy_kwh);
    totals.co2_grams += toNumber(row.co2_grams);

    return totals;
  }, emptySummary());

  return {
    ...summary,
    cost_usd: roundToDecimalPlaces(summary.cost_usd, 12),
    energy_kwh: roundToDecimalPlaces(summary.energy_kwh, 12),
    co2_grams: roundToDecimalPlaces(summary.co2_grams, 9)
  };
}

function toRecentUsageLog(row: Record<string, unknown>): RecentUsageLogDto {
  return {
    provider: toString(row.provider),
    model: toNullableString(row.model),
    endpoint: toString(row.endpoint),
    input_tokens: toInteger(row.input_tokens),
    output_tokens: toInteger(row.output_tokens),
    total_tokens: toInteger(row.total_tokens),
    cost_usd: toNumber(row.cost_usd),
    energy_kwh: toNumber(row.energy_kwh),
    co2_grams: toNumber(row.co2_grams),
    latency_ms: toNullableInteger(row.latency_ms),
    status_code: toInteger(row.status_code),
    created_at: toString(row.created_at)
  };
}

function sendReadError(res: Response, error: unknown): void {
  console.warn("Summary API Supabase read failed", error);
  res.status(500).json({
    error: {
      message: "Failed to read usage data",
      type: "summary_api_error"
    }
  });
}

export async function readUsageSummary(): Promise<UsageSummaryDto> {
  const rows = await selectSupabaseRows("usage_logs", {
    query: {
      select: SUMMARY_SELECT
    }
  });

  return summarizeRows(rows);
}

export async function readRecentUsageLogs(limit = RECENT_LIMIT): Promise<RecentUsageLogsResponseDto> {
  const rows = await selectSupabaseRows("usage_logs", {
    query: {
      select: RECENT_SELECT,
      order: "created_at.desc",
      limit: String(limit)
    }
  });

  return {
    items: rows.map(toRecentUsageLog)
  };
}

export const summaryApi = Router();

summaryApi.get("/summary", async (_req: Request, res: Response) => {
  try {
    res.json(await readUsageSummary());
  } catch (error) {
    sendReadError(res, error);
  }
});

summaryApi.get("/recent", async (_req: Request, res: Response) => {
  try {
    res.json(await readRecentUsageLogs());
  } catch (error) {
    sendReadError(res, error);
  }
});
