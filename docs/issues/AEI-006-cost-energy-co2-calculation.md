# AEI-006: Cost / Energy / CO2 Calculation

Status: Done

## Purpose

Compute V1 cost, energy, and CO2 estimates from extracted OpenAI usage payloads before persistence work starts.

## Scope

- Add shared usage-impact types for `cost_usd`, `energy_kwh`, and `co2_grams`.
- Add explicit default calculation constants.
- Keep calculation logic isolated from Supabase and persistence.
- Wire calculated values into the console usage payload created by AEI-003.
- Preserve upstream response status and body exactly.
- Keep support focused on non-streaming OpenAI JSON usage responses.
- Extend the fake-upstream smoke path to verify calculated values.

## Out Of Scope

- Supabase persistence
- API key authentication
- Dashboard APIs
- Dashboard UI
- DB schema changes during the original calculator task; cost precision was later fixed under AEI-012
- Streaming response usage extraction or persistence
- Live OpenAI-dependent tests

## Default Constants

The V1 defaults are product-demo estimates. They are configurable constants and are not scientific claims.

- `pricing_usd_per_million_tokens_by_model`: model-specific V1 demo cost rates.
  - `gpt-4.1`: input `$2.00` and output `$8.00` per 1M tokens.
  - `gpt-4.1-mini`: input `$0.40` and output `$1.60` per 1M tokens.
  - `gpt-4.1-nano`: input `$0.10` and output `$0.40` per 1M tokens.
- `fallback_pricing_usd_per_million_tokens`: input `$0.40` and output `$1.60` per 1M tokens, matching the V1 `gpt-4.1-mini` demo default so unknown or missing models still produce numeric demo output.
- `energy_kwh_per_1k_tokens`: `0.0003` kWh per 1,000 tokens. This is a V1 product-demo estimate only, not a scientific claim about any provider, model, workload, region, or hardware.
- `co2_grams_per_kwh`: `400` grams CO2 per kWh. This is a V1 product-demo estimate only, not a measured grid, datacenter, or lifecycle-emissions claim.

Pricing defaults were checked against OpenAI-published GPT-4.1 series pricing on 2026-04-27 at https://openai.com/index/gpt-4-1/ and should be treated as configurable product constants, not a guarantee that provider pricing remains current.

## Acceptance Criteria

- The client receives the upstream status code unchanged.
- The client receives the upstream raw response body unchanged.
- Non-streaming JSON responses with usage data produce a console usage payload containing `cost_usd`, `energy_kwh`, and `co2_grams` alongside the AEI-003 fields.
- Calculation code is reusable by future persistence and API work.
- `npm.cmd run build:backend` succeeds.
- The fake-upstream smoke test succeeds.

## Verification

- `npm.cmd run build:backend` passed.
- `npm.cmd --workspace @aei/backend run smoke:usage` passed against a fake upstream.
- The first smoke test attempt failed inside the sandbox with `spawn EPERM` from `tsx`; rerunning the same command with escalation passed.

## GitHub

Tracked in GitHub issue #8. Closed as completed.
