# AEI-012: Review Fixes - Streaming Proxy / Cost Precision / Windows Scripts

Status: Done

## Purpose

Address the focused review findings without expanding V1 scope.

## Scope

- Stream OpenAI upstream response bytes to clients immediately with backpressure handling.
- Preserve non-streaming OpenAI JSON usage extraction, cost calculation, console logging, and async Supabase persistence.
- Treat streaming/SSE responses as pass-through only with no V1 usage logging.
- Keep response collection bounded and skip usage extraction when a non-streaming JSON body exceeds the cap.
- Preserve 12 decimal places for `usage_logs.cost_usd` in fresh and already-applied Supabase schemas.
- Use `npm.cmd` for workspace npm scripts on Windows.
- Extend fake-upstream smoke coverage for streaming/SSE pass-through and no persistence.

## Out Of Scope

- Live OpenAI requests.
- Live Supabase writes.
- Dashboard changes.
- Streaming usage extraction or persistence.
- Calculator rounding changes.

## Acceptance Criteria

- Non-streaming JSON responses still return upstream status, headers, and raw body unchanged while producing usage logs.
- Streaming/SSE responses return upstream status, headers, and chunks unchanged, including first-chunk forwarding before upstream end.
- Streaming/SSE responses do not log usage or insert `usage_logs` rows in V1.
- Fresh Supabase installs use `cost_usd numeric(18, 12)` and existing installs can apply a follow-up precision migration.
- `rg -n "npm --workspace" package.json apps/backend/package.json` returns no matches.
- `npm.cmd run build:backend` passes.
- `npm.cmd --workspace @aei/backend run smoke:usage` passes.
- `npm.cmd --workspace @aei/backend run smoke:auth` passes.

## Verification

- `npm.cmd run build:backend` passed.
- `npm.cmd --workspace @aei/backend run smoke:usage` passed against fake upstream and fake Supabase servers.
- `npm.cmd --workspace @aei/backend run smoke:auth` passed against fake upstream and fake Supabase servers.
- Both `tsx` smoke commands first hit sandbox `spawn EPERM`; rerunning the same commands with escalation passed.

## GitHub

Pending. Recreate this as a GitHub issue when GitHub issue seeding is available.
