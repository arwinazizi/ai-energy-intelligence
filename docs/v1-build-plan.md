# V1 Build Plan

This is a historical execution plan for the completed V1 prototype. It documents the order used to reach the V1 demo and should not be read as the current task list. The current project state is tracked in `docs/project-status.md` and `docs/issue-register.md`.

## Definition Of Done

- One non-streaming OpenAI JSON request can be sent through the proxy.
- The proxy returns the upstream response without reshaping it.
- A `usage_logs` row is written with tokens, latency, cost, energy, and CO2.
- Streaming/SSE responses are forwarded unchanged and are not logged in V1.
- The dashboard shows `GET /api/summary` and `GET /api/recent`.

## Execution Order

### Phase 1: Proxy Pass-Through

Goal: prove the proxy can forward requests safely.

- create backend entry point
- add `/openai/*` route
- forward headers and body upstream
- return status and body unchanged
- stream upstream response bytes to the client with backpressure handling

### Phase 2: Usage Extraction

Goal: capture real usage metadata from successful responses.

- parse model and token usage from OpenAI responses
- measure latency in the proxy layer
- print extracted payload to console before DB work starts
- skip extraction for streaming/SSE responses in V1

### Phase 3: Calculation

Goal: make the logged records meaningful enough for demos before database work starts.

- add shared usage and calculation types
- calculate input and output cost by model
- estimate energy from token volume
- estimate CO2 from energy and chosen carbon intensity
- wire calculated values into the console usage payload

### Phase 4: Persistence

Goal: store raw usage and derived metrics.

- apply `supabase/migrations/0001_v1_init.sql`
- preserve `cost_usd` with 12 decimal places in the schema
- create async logger
- insert rows into `usage_logs`

### Phase 5: Auth

Goal: reject unauthorized traffic before proxying.

- read `x-api-key`
- hash and compare against `api_keys`
- keep auth minimal and single-tenant for V1

### Phase 6: Summary API

Goal: expose stored usage data through small backend DTOs.

- define summary and recent-log DTOs in `packages/shared`
- expose `GET /api/summary`
- expose `GET /api/recent`
- verify empty and populated states

### Phase 7: Dashboard UI

Goal: make the flow visible in one page.

- render totals and a recent logs table
- handle loading, empty, and error states
- keep the current visual direction while replacing fake data

### Phase 8: Demo Path

Goal: prove the full local V1 path can be repeated.

- send one OpenAI request through the proxy
- write one `usage_logs` row
- show the result on the dashboard
- document required commands, env vars, expected output, and known limitations

## Key Implementation Files

- `apps/backend/src/proxy/openaiProxy.ts`
- `apps/backend/src/providers/openai.ts`
- `apps/backend/src/logging/logUsage.ts`
- `apps/backend/src/auth/validateApiKey.ts`
- `apps/backend/src/db/supabase.ts`
- `packages/shared/src/usageImpact.ts`
- `apps/backend/src/api/summary.ts`

## Historical Stop Condition For The First Coding Session

Stop as soon as one non-streaming OpenAI JSON response is forwarded unchanged and the extracted usage payload is printed correctly. That de-risks the core path before database or UI work starts.
