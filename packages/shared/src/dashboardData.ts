export type UsageSummaryDto = {
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  energy_kwh: number;
  co2_grams: number;
};

export type RecentUsageLogDto = {
  provider: string;
  model: string | null;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  energy_kwh: number;
  co2_grams: number;
  latency_ms: number | null;
  status_code: number;
  created_at: string;
};

export type RecentUsageLogsResponseDto = {
  items: RecentUsageLogDto[];
};
