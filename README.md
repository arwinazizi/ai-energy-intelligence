# AI Energy Intelligence

AI Energy Intelligence is a proxy-based measurement layer for AI usage. The V1 prototype proves the core flow: send one real OpenAI request through a proxy, extract usage, estimate cost and environmental impact, store it in Supabase, and expose the result in a minimal dashboard.

## Current Status

This repository contains the completed V1 working prototype based on [IMPLEMENTATION.md](./IMPLEMENTATION.md), plus the completed V2 pilot-readiness slices from AEI-013, AEI-014, and AEI-015. `main` is aligned with `origin/main`, docs sync PR #22 is merged, and no implementation task is active.

The next project decision is choosing the next bounded V2 pilot-readiness task. The recommended candidate is a minimal dashboard CSV download action that uses the existing `GET /api/usage.csv` endpoint.

It includes:

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
- read-only summary APIs for totals and recent usage logs
- a V1 dashboard wired to the backend summary and recent-log APIs
- a repeatable demo smoke path for request -> Supabase row -> dashboard verification
- Supabase migrations with `cost_usd` stored as `numeric(18, 12)`
- Windows-safe `npm.cmd` workspace scripts
- restored local GitHub CLI authentication for CLI-only GitHub workflows
- V2 organization ownership for API keys and usage logs
- tenant-scoped summary and recent APIs that require `x-api-key`
- tenant-scoped CSV export through `GET /api/usage.csv`
- minimal pilot dashboard login
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

## Completed V1 Build Path

1. Extract model, token usage, endpoint, status code, and latency from non-streaming OpenAI JSON responses.
2. Add isolated cost, energy, and CO2 calculation logic.
3. Persist logs and calculated metrics in Supabase.
4. Add API key validation.
5. Build summary APIs and wire the dashboard to real data.
6. Keep streaming/SSE responses as pass-through only until streaming usage extraction is scoped.

## Current V2 Status

- Issue #15 added organizations and tenant-scoped API keys, and was completed, closed, and merged via PR #17.
- Issue #18 / AEI-014 added a minimal pilot dashboard login and was completed, closed, and merged via PR #20.
- Issue #19 / AEI-015 added tenant-scoped CSV export and was completed, closed, and merged via PR #21.
- Docs sync PR #22 is merged.
- No implementation task is active.
- Next recommended decision: pick the next bounded V2 pilot-readiness task, likely a dashboard CSV download action that calls the completed `GET /api/usage.csv` endpoint.
- Multi-provider support and streaming usage logging remain outside the completed V2 pilot-readiness slices.
- The local dashboard can send `VITE_AEI_CLIENT_API_KEY` for protected tenant-scoped API reads during pilot/dev use.

## Key Docs

- [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/project-status.md](./docs/project-status.md)
- [docs/issue-register.md](./docs/issue-register.md)
- [docs/github-bootstrap.md](./docs/github-bootstrap.md)
- [docs/tracking.md](./docs/tracking.md)
- [docs/v1-build-plan.md](./docs/v1-build-plan.md)
- [docs/v1-demo-path.md](./docs/v1-demo-path.md)

Current task status is tracked in GitHub issue #2 and mirrored in [docs/project-status.md](./docs/project-status.md) and [docs/issue-register.md](./docs/issue-register.md).
