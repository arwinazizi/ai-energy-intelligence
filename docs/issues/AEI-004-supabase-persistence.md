# AEI-004: Supabase Persistence

Status: Done

## Purpose

Persist extracted OpenAI usage rows and calculated impact values to Supabase without changing the proxy response path.

## Scope

- Add a Supabase PostgREST helper that uses Node `fetch`.
- Read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the runtime environment.
- Add an async usage logger for `public.usage_logs`.
- Wire usage persistence into the OpenAI proxy after usage extraction and impact calculation.
- Preserve upstream response status, headers, and raw body.
- Console-warn persistence failures without blocking or changing the upstream response.
- Extend the fake-upstream smoke path to verify persistence wiring without real Supabase writes.

## Out Of Scope

- API key authentication
- Dashboard APIs
- Dashboard UI
- Summary queries
- Streaming response usage extraction or persistence
- Live Supabase-dependent tests

## Acceptance Criteria

- Non-streaming JSON responses with usage data produce a `usage_logs` insert payload containing provider, model, endpoint, token counts, status, latency, cost, energy, and CO2 values.
- The insert uses Supabase PostgREST and service-role credentials without adding a Supabase client dependency.
- The client receives the upstream status code unchanged.
- The client receives the upstream raw response body unchanged.
- Persistence failures are console-warned and do not alter the upstream response.
- `npm.cmd run build:backend` succeeds.
- The fake-upstream smoke test succeeds with fake Supabase persistence checks.

## Verification

- `npm.cmd run build:backend` passed.
- `npm.cmd --workspace @aei/backend run smoke:usage` passed against fake upstream and fake Supabase servers.
- The first smoke test attempt failed inside the sandbox with `spawn EPERM` from `tsx`; rerunning the same command with escalation passed.

## GitHub

Pending. Recreate this as a GitHub issue when GitHub issue seeding is available.
