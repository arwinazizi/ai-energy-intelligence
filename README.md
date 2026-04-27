# AI Energy Intelligence

AI Energy Intelligence is a proxy-based measurement layer for AI usage. The V1 target is straightforward: send one real OpenAI request through a proxy, extract usage, estimate cost and environmental impact, store it in Supabase, and expose the result in a minimal dashboard.

## Current Status

This repository is a V1 prototype scaffold based on [IMPLEMENTATION.md](./IMPLEMENTATION.md). It now includes:

- a monorepo-shaped folder structure for backend, dashboard, and shared code
- architecture and execution docs for the V1 prototype
- a static V0 dashboard concept in `apps/dashboard`
- an Express `/openai/*` proxy pass-through in `apps/backend`
- a first Supabase migration
- environment and repository hygiene files

## V1 Success Criteria

- proxy forwards a real OpenAI request
- client receives the upstream response unchanged
- usage is extracted and persisted to `usage_logs`
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

## Key Docs

- [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/project-status.md](./docs/project-status.md)
- [docs/issue-register.md](./docs/issue-register.md)
- [docs/github-bootstrap.md](./docs/github-bootstrap.md)
- [docs/tracking.md](./docs/tracking.md)
- [docs/v1-build-plan.md](./docs/v1-build-plan.md)

The immediate next implementation step is AEI-003: usage extraction from proxied OpenAI responses while preserving the upstream response for the client.
