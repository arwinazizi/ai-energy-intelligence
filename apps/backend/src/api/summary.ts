import type { Request, Response } from "express";
import { Router } from "express";
import type { RecentUsageLogDto, RecentUsageLogsResponseDto, UsageSummaryDto } from "@aei/shared";
import { validateApiKey } from "../auth/validateApiKey.js";
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
const CSV_EXPORT_LIMIT = 1000;
const CSV_EXPORT_COLUMNS: Array<{ header: string; field: keyof RecentUsageLogDto }> = [
  { header: "created_at", field: "created_at" },
  { header: "provider", field: "provider" },
  { header: "model", field: "model" },
  { header: "endpoint", field: "endpoint" },
  { header: "input_tokens", field: "input_tokens" },
  { header: "output_tokens", field: "output_tokens" },
  { header: "total_tokens", field: "total_tokens" },
  { header: "cost_usd", field: "cost_usd" },
  { header: "energy_kwh", field: "energy_kwh" },
  { header: "co2_grams", field: "co2_grams" },
  { header: "latency_ms", field: "latency_ms" },
  { header: "status_code", field: "status_code" }
];

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

function serializeCsvValue(value: RecentUsageLogDto[keyof RecentUsageLogDto]): string {
  if (value === null) {
    return "";
  }

  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeUsageLogsCsv(rows: RecentUsageLogDto[]): string {
  const header = CSV_EXPORT_COLUMNS.map((column) => column.header).join(",");
  const body = rows.map((row) =>
    CSV_EXPORT_COLUMNS.map((column) => serializeCsvValue(row[column.field])).join(",")
  );

  return [header, ...body].join("\r\n") + "\r\n";
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

function getClientApiKey(req: Request): string | undefined {
  const value = req.get("x-api-key")?.trim();
  return value || undefined;
}

function sendAuthenticationError(res: Response): void {
  res.status(401).json({
    error: {
      message: "Missing or invalid API key",
      type: "authentication_error"
    }
  });
}

async function resolveOrganizationId(req: Request, res: Response): Promise<string | null> {
  const clientApiKey = getClientApiKey(req);

  if (!clientApiKey) {
    sendAuthenticationError(res);
    return null;
  }

  try {
    const authContext = await validateApiKey(clientApiKey);
    if (!authContext) {
      sendAuthenticationError(res);
      return null;
    }

    return authContext.organizationId;
  } catch (error) {
    console.warn("Summary API key validation failed", error);
    sendAuthenticationError(res);
    return null;
  }
}

export async function readUsageSummary(organizationId: string): Promise<UsageSummaryDto> {
  const rows = await selectSupabaseRows("usage_logs", {
    query: {
      select: SUMMARY_SELECT,
      organization_id: `eq.${organizationId}`
    }
  });

  return summarizeRows(rows);
}

export async function readRecentUsageLogs(
  organizationId: string,
  limit = RECENT_LIMIT
): Promise<RecentUsageLogsResponseDto> {
  const rows = await selectSupabaseRows("usage_logs", {
    query: {
      select: RECENT_SELECT,
      organization_id: `eq.${organizationId}`,
      order: "created_at.desc",
      limit: String(limit)
    }
  });

  return {
    items: rows.map(toRecentUsageLog)
  };
}

export async function readUsageLogExport(organizationId: string, limit = CSV_EXPORT_LIMIT): Promise<RecentUsageLogDto[]> {
  const rows = await selectSupabaseRows("usage_logs", {
    query: {
      select: RECENT_SELECT,
      organization_id: `eq.${organizationId}`,
      order: "created_at.desc",
      limit: String(limit)
    }
  });

  return rows.map(toRecentUsageLog);
}

export const summaryApi = Router();

summaryApi.get("/summary", async (req: Request, res: Response) => {
  const organizationId = await resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  try {
    res.json(await readUsageSummary(organizationId));
  } catch (error) {
    sendReadError(res, error);
  }
});

summaryApi.get("/recent", async (req: Request, res: Response) => {
  const organizationId = await resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  try {
    res.json(await readRecentUsageLogs(organizationId));
  } catch (error) {
    sendReadError(res, error);
  }
});

summaryApi.get("/usage.csv", async (req: Request, res: Response) => {
  const organizationId = await resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  try {
    const csv = serializeUsageLogsCsv(await readUsageLogExport(organizationId));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="aei-usage-export.csv"');
    res.setHeader("Cache-Control", "no-store");
    res.send(csv);
  } catch (error) {
    sendReadError(res, error);
  }
});
