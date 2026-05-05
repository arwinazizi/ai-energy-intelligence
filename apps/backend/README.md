# Backend

The backend owns the V1 critical path:

- validate the shared API key
- proxy OpenAI requests
- extract usage and latency
- calculate cost, energy, and CO2
- log asynchronously
- expose summary endpoints for the dashboard

## Current Proxy Pass-Through

Run the backend locally:

```bash
npm.cmd run dev:backend
```

The server loads `.env` from the repo root when present.

The first proxy route is:

```text
/openai/*
```

Requests to `/openai/v1/...` are forwarded to `https://api.openai.com/v1/...` by default. Set `OPENAI_BASE_URL` to point at a different upstream during smoke tests. Set `OPENAI_API_KEY` to have the proxy apply the upstream bearer token when the request does not already include `Authorization`.

The proxy validates the client `x-api-key` before proxying by hashing it with SHA-256 and checking `public.api_keys.key_hash` through Supabase PostgREST. Missing or invalid keys receive a small JSON 401 response and do not reach the upstream. Authorized requests preserve the upstream status code, headers, and raw response body for the client.

The proxy extracts usage payloads from non-streaming OpenAI JSON responses, calculates V1 demo estimates for `cost_usd`, `energy_kwh`, and `co2_grams` from `@aei/shared`, logs the payload to the console, and asynchronously persists it to Supabase `public.usage_logs` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Persistence failures are console warnings only and do not alter the upstream response. Streaming/SSE responses are forwarded as pass-through bytes only and are not logged in V1. Dashboard UI, key management UI, and streaming usage extraction are still out of scope.

The backend also exposes read-only dashboard data endpoints:

```text
GET /api/summary
GET /api/recent
```

`/api/summary` returns aggregate request, token, cost, energy, and CO2 totals. `/api/recent` returns the 10 newest `usage_logs` rows with provider, model, endpoint, token counts, estimates, latency, status code, and creation time. Empty databases return zero totals and an empty recent list.

The Supabase schema stores `usage_logs.cost_usd` as `numeric(18, 12)` so the 12-decimal calculator output is preserved. Use `npm.cmd` for workspace scripts on Windows.

Run the repeatable fake-upstream usage smoke test. It uses local fake upstream and Supabase servers, so it does not write to the real Supabase project:

```bash
npm.cmd --workspace @aei/backend run smoke:usage
```

Run the focused fake-upstream API-key auth smoke test:

```bash
npm.cmd --workspace @aei/backend run smoke:auth
```

Run the fake-Supabase Summary API smoke test:

```bash
npm.cmd --workspace @aei/backend run smoke:summary
```

Run the live AEI-009 demo smoke after starting the backend with real OpenAI and Supabase credentials:

```bash
npm.cmd --workspace @aei/backend run smoke:demo
```

This sends one non-streaming OpenAI request through `/openai/v1/chat/completions` with `AEI_CLIENT_API_KEY`, then verifies the new data through `/api/summary` and `/api/recent`. See `../../docs/v1-demo-path.md` for the full command path and Supabase API-key setup.

Run the backend build, including the shared calculator package:

```bash
npm.cmd run build:backend
```

## Current Key Files

- `src/index.ts`
- `src/proxy/openaiProxy.ts`
- `src/providers/openai.ts`
- `src/auth/validateApiKey.ts`
- `src/logging/logUsage.ts`
- `src/api/summary.ts`
- `src/db/supabase.ts`
- `../../packages/shared/src/dashboardData.ts`
- `../../packages/shared/src/usageImpact.ts`
