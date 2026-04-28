# AI Energy Intelligence

AI Energy Intelligence is a proxy-based measurement layer for AI usage. The V1 target is straightforward: send one real OpenAI request through a proxy, extract usage, estimate cost and environmental impact, store it in Supabase, and expose the result in a minimal dashboard.

## Current Status

This repository is a V1 prototype scaffold based on [IMPLEMENTATION.md](./IMPLEMENTATION.md). It now includes:

- a monorepo-shaped folder structure for backend, dashboard, and shared code
- architecture and execution docs for the V1 prototype
- a static V0 dashboard concept in `apps/dashboard`
- an Express `/openai/*` proxy pass-through in `apps/backend`
- usage extraction for non-streaming OpenAI JSON responses
- shared V1 demo calculation logic for `cost_usd`, `energy_kwh`, and `co2_grams`
- async Supabase persistence for OpenAI usage rows through PostgREST
- streaming/SSE OpenAI responses that pass through unchanged without V1 usage logging
- a fake-upstream backend smoke test for usage extraction, calculated impact values, and persistence wiring
- minimal `x-api-key` validation against hashed keys in Supabase before proxying upstream
- a fake-upstream backend smoke test for API-key auth and authorized usage logging
- Supabase migrations with `cost_usd` stored as `numeric(18, 12)`
- Windows-safe `npm.cmd` workspace scripts
- environment and repository hygiene files

## V1 Success Criteria

- proxy forwards a real OpenAI request
- client receives the upstream response unchanged
- usage is extracted and persisted to `usage_logs` for non-streaming JSON responses
- streaming/SSE responses are pass-through only and are not logged in V1
- dashboard shows summary metrics and recent events

## Repo Layout

```text
apps/
  backend/
  dashboard/
docs/
packages/
  shared/
scripts/
supabase/
  migrations/
```

## First Build Order

1. Extract model, token usage, endpoint, status code, and latency from non-streaming OpenAI JSON responses.
2. Add isolated cost, energy, and CO2 calculation logic.
3. Persist logs and calculated metrics in Supabase.
4. Add API key validation.
5. Build summary APIs and wire the dashboard to real data.
6. Keep streaming/SSE responses as pass-through only until streaming usage extraction is scoped.

## Key Docs

- [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/project-status.md](./docs/project-status.md)
- [docs/issue-register.md](./docs/issue-register.md)
- [docs/github-bootstrap.md](./docs/github-bootstrap.md)
- [docs/tracking.md](./docs/tracking.md)
- [docs/v1-build-plan.md](./docs/v1-build-plan.md)

AEI-003 usage extraction, AEI-004 Supabase persistence, AEI-005 API key validation, AEI-006 cost / energy / CO2 calculation, and AEI-012 review fixes are complete. Current task status is tracked in GitHub issue #2 and mirrored in [docs/project-status.md](./docs/project-status.md) and [docs/issue-register.md](./docs/issue-register.md).
