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

The proxy validates the client `x-api-key` before proxying by hashing it with SHA-256 and checking `public.api_keys.key_hash` through Supabase PostgREST. A valid key resolves to its `organization_id`. Missing or invalid keys receive a small JSON 401 response and do not reach the upstream. Authorized requests preserve the upstream status code, headers, and raw response body for the client.

The proxy extracts usage payloads from non-streaming OpenAI JSON responses, calculates V1 demo estimates for `cost_usd`, `energy_kwh`, and `co2_grams` from `@aei/shared`, logs the payload to the console, and asynchronously persists it to Supabase `public.usage_logs` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Usage inserts include the resolved `organization_id`. Persistence failures are console warnings only and do not alter the upstream response. Streaming/SSE responses are forwarded as pass-through bytes only and are not logged in V1. Key management UI and streaming usage extraction are still out of scope.

The backend also exposes minimal pilot dashboard session endpoints:

```text
GET /api/dashboard/session
POST /api/dashboard/login
POST /api/dashboard/logout
```

Configure the pilot login with `DASHBOARD_PILOT_USERNAME` and either `DASHBOARD_PILOT_PASSWORD` or `DASHBOARD_PILOT_PASSWORD_SHA256`. Set `DASHBOARD_SESSION_SECRET` for signed HttpOnly cookies. Optional settings are `DASHBOARD_SESSION_SECONDS`, `DASHBOARD_COOKIE_SECURE=true` for HTTPS, and `DASHBOARD_CORS_ORIGIN` for the dashboard origin.

The backend also exposes read-only dashboard data endpoints:

```text
GET /api/summary
GET /api/recent
GET /api/usage.csv
```

All three endpoints require `x-api-key`. `/api/summary` returns aggregate request, token, cost, energy, and CO2 totals for the key's organization. `/api/recent` returns the 10 newest `usage_logs` rows for the key's organization with provider, model, endpoint, token counts, estimates, latency, status code, and creation time. `/api/usage.csv` returns a bounded CSV export of the newest 1000 usage rows for the key's organization using the same fields. Empty tenant datasets return zero totals, an empty recent list, or a header-only CSV export.

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

Run the fake-Supabase CSV export smoke test:

```bash
npm.cmd --workspace @aei/backend run smoke:csv-export
```

Run the focused dashboard login/session smoke test:

```bash
npm.cmd --workspace @aei/backend run smoke:dashboard-auth
```

Run the live AEI-009 demo smoke after starting the backend with real OpenAI and Supabase credentials:

```bash
npm.cmd --workspace @aei/backend run smoke:demo
```

This sends one non-streaming OpenAI request through `/openai/v1/chat/completions` with `AEI_CLIENT_API_KEY`, then verifies the new tenant-scoped data through `/api/summary` and `/api/recent` using the same key. See `../../docs/v1-demo-path.md` for the full command path and Supabase API-key setup.

Run the backend build, including the shared calculator package:

```bash
npm.cmd run build:backend
```

## Current Key Files

- `src/index.ts`
- `src/proxy/openaiProxy.ts`
- `src/providers/openai.ts`
- `src/auth/validateApiKey.ts`
- `src/auth/dashboardSession.ts`
- `src/logging/logUsage.ts`
- `src/api/summary.ts`
- `src/db/supabase.ts`
- `../../packages/shared/src/dashboardData.ts`
- `../../packages/shared/src/usageImpact.ts`
