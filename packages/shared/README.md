# Shared Package

Keep cross-app contracts here so backend and dashboard do not drift.

Current early contents:

- usage-impact input and output types
- V1 model pricing constants
- V1 energy and CO2 estimate constants
- pure cost / energy / CO2 calculation logic

## V1 Calculation Defaults

All defaults live in `src/usageImpact.ts` and are configurable. They are product-demo estimates for V1, not scientific claims.

- `pricing_usd_per_million_tokens_by_model`: `gpt-4.1` at `$2.00` input and `$8.00` output per 1M tokens, `gpt-4.1-mini` at `$0.40` input and `$1.60` output per 1M tokens, and `gpt-4.1-nano` at `$0.10` input and `$0.40` output per 1M tokens.
- `fallback_pricing_usd_per_million_tokens`: `$0.40` input and `$1.60` output per 1M tokens, matching the V1 `gpt-4.1-mini` demo default for unknown or missing models.
- `energy_kwh_per_1k_tokens`: `0.0003` kWh per 1,000 tokens, a V1 demo estimate only.
- `co2_grams_per_kwh`: `400` grams CO2 per kWh, a V1 demo estimate only.

Pricing defaults were checked against OpenAI-published GPT-4.1 series pricing on 2026-04-27 at https://openai.com/index/gpt-4-1/. Update the constants when pricing assumptions change.
