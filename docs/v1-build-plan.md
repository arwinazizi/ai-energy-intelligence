# V1 Build Plan

## Definition Of Done

- One OpenAI request can be sent through the proxy.
- The proxy returns the upstream response without reshaping it.
- A `usage_logs` row is written with tokens, latency, cost, energy, and CO2.
- The dashboard shows `GET /api/summary` and `GET /api/recent`.

## Execution Order

### Phase 1: Proxy Pass-Through

Goal: prove the proxy can forward requests safely.

- create backend entry point
- add `/openai/*` route
- forward headers and body upstream
- return status and body unchanged

### Phase 2: Usage Extraction

Goal: capture real usage metadata from successful responses.

- parse model and token usage from OpenAI responses
- measure latency in the proxy layer
- print extracted payload to console before DB work starts

### Phase 3: Persistence

Goal: store raw usage and derived metrics.

- apply `supabase/migrations/0001_v1_init.sql`
- create async logger
- insert rows into `usage_logs`

### Phase 4: Auth

Goal: reject unauthorized traffic before proxying.

- read `x-api-key`
- hash and compare against `api_keys`
- keep auth minimal and single-tenant for V1

### Phase 5: Calculation

Goal: make the logged records meaningful enough for demos.

- calculate input and output cost by model
- estimate energy from token volume
- estimate CO2 from energy and chosen carbon intensity

### Phase 6: Dashboard

Goal: make the flow visible in one page.

- expose `GET /api/summary`
- expose `GET /api/recent`
- render totals and a recent logs table

## First Files To Implement

- `apps/backend/src/index.ts`
- `apps/backend/src/proxy/openaiProxy.ts`
- `apps/backend/src/providers/openai.ts`
- `apps/backend/src/auth/validateApiKey.ts`
- `apps/backend/src/logging/logUsage.ts`
- `apps/backend/src/calculator/calculateImpact.ts`

## Stop Condition For The First Coding Session

Stop as soon as one real request is forwarded and usage is printed correctly. That de-risks the core path before you spend time on the database or UI.
