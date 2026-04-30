# AEI-007: Summary API

Status: Done

## Purpose

Expose the stored usage data needed by the V1 dashboard through small backend API DTOs.

## Scope

- Add shared DTOs for aggregate summary totals and recent usage log rows.
- Expose `GET /api/summary`.
- Expose `GET /api/recent`.
- Read from Supabase PostgREST through the existing backend helper style.
- Handle empty `usage_logs` state with zero totals and an empty recent list.
- Keep V1 dashboard APIs read-only and unauthenticated.
- Add fake-Supabase smoke coverage for empty and populated states.

## Out Of Scope

- Dashboard UI wiring.
- Dashboard authentication.
- Key management UI.
- Provider filtering, date filtering, pagination, or multi-tenant scoping.

## Response Shapes

`GET /api/summary` returns aggregate totals:

```json
{
  "request_count": 0,
  "input_tokens": 0,
  "output_tokens": 0,
  "total_tokens": 0,
  "cost_usd": 0,
  "energy_kwh": 0,
  "co2_grams": 0
}
```

`GET /api/recent` returns the newest rows:

```json
{
  "items": []
}
```

Recent items include `provider`, `model`, `endpoint`, `input_tokens`, `output_tokens`, `total_tokens`, `cost_usd`, `energy_kwh`, `co2_grams`, `latency_ms`, `status_code`, and `created_at`.

## Verification

- `npm.cmd run build:backend` passed.
- `npm.cmd --workspace @aei/backend run smoke:summary` passed against a fake Supabase server.
- `npm.cmd --workspace @aei/backend run smoke:auth` passed against local fake upstream and Supabase servers.
- `npm.cmd --workspace @aei/backend run smoke:usage` passed against local fake upstream and Supabase servers.
- Smoke scripts that use `tsx` initially failed inside the sandbox with `spawn EPERM`; rerunning them with escalation passed.

## GitHub

Tracked in GitHub issue #9. Ready to close as completed.
