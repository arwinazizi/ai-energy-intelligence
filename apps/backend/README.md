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

The proxy now extracts usage payloads from non-streaming OpenAI JSON responses while preserving the upstream status code and raw response body for the client. It calculates V1 demo estimates for `cost_usd`, `energy_kwh`, and `co2_grams` from `@aei/shared`, logs the payload to the console, and asynchronously persists it to Supabase `public.usage_logs` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Persistence failures are console warnings only and do not alter the upstream response. API key auth, dashboard APIs, dashboard UI, and streaming response support are still out of scope.

Run the repeatable fake-upstream usage smoke test. It uses local fake upstream and Supabase servers, so it does not write to the real Supabase project:

```bash
npm.cmd --workspace @aei/backend run smoke:usage
```

Run the backend build, including the shared calculator package:

```bash
npm.cmd run build:backend
```

## Suggested First Files

- `src/index.ts`
- `src/proxy/openaiProxy.ts`
- `src/providers/openai.ts`
- `src/auth/validateApiKey.ts`
- `src/logging/logUsage.ts`
- `src/calculator/calculateImpact.ts`
- `src/api/summary.ts`
- `src/db/supabase.ts`
