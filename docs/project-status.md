# Project Status

This file mirrors GitHub tracker issue #2. GitHub issues are the source of truth; keep this file aligned so local-only agent recovery still works.

## Done

- Wrote the initial product and V1 implementation brief in `IMPLEMENTATION.md`
- Created the repository scaffold for backend, dashboard, shared package, Supabase, docs, and scripts
- Added architecture and build-plan documentation
- Added issue templates, PR template, and tracking rules
- Initialized local Git on `main`
- Created local issue `AEI-011` for the V0 static concept demo
- Built the V0 dashboard concept page in `apps/dashboard`
- Created local issue `AEI-002` for proxy pass-through
- Built the smallest Express backend proxy for `/openai/*`
- Verified the proxy against a fake upstream for method, path/query, headers, body, status, and response headers
- Verified a live OpenAI `/v1/models` request through the proxy using the gitignored root `.env`
- Pushed `main` to the GitHub remote at `arwinazizi/ai-energy-intelligence`
- Added usage extraction for non-streaming OpenAI JSON responses while preserving upstream status and raw body
- Added a repeatable fake-upstream smoke test for the usage extraction path
- Added shared V1 cost, energy, and CO2 calculation types, constants, and calculator logic
- Wired calculated `cost_usd`, `energy_kwh`, and `co2_grams` into the console-only OpenAI usage payload
- Extended the fake-upstream smoke test to verify calculated usage-impact values while preserving the upstream response
- Added a Supabase PostgREST helper that uses Node `fetch` and the root `.env` Supabase service-role credentials
- Added asynchronous usage logging into `public.usage_logs` for OpenAI usage payloads and calculated impact values
- Wired persistence into the OpenAI proxy without awaiting it before returning the upstream response
- Extended the fake-upstream smoke test to verify the Supabase insert payload and warn-only persistence failures
- Added minimal `x-api-key` validation for OpenAI proxy requests using SHA-256 hashes in `public.api_keys.key_hash`
- Rejects missing or invalid proxy API keys with a small JSON 401 before any upstream request is made
- Added a focused fake-upstream auth smoke test for missing, invalid, and valid keys plus authorized usage logging
- Reworked the OpenAI proxy to stream upstream response bytes directly with backpressure handling
- Kept non-streaming JSON usage extraction and Supabase logging on a bounded response tee after the client response ends
- Added streaming/SSE smoke coverage proving first-chunk forwarding before upstream end with no usage log insert
- Updated `usage_logs.cost_usd` to `numeric(18, 12)` for fresh and existing Supabase installs
- Changed workspace npm scripts to use `npm.cmd` on Windows
- Seeded GitHub tracker, V1 epic, and task issues from the local issue register
- Added shared dashboard DTOs for summary totals and recent usage logs
- Exposed `GET /api/summary` for aggregate request, token, cost, energy, and CO2 totals from Supabase `usage_logs`
- Exposed `GET /api/recent` for the newest usage log rows with provider, model, endpoint, tokens, estimates, latency, status, and creation time
- Added fake-Supabase smoke coverage for empty and populated Summary API states
- Built the AEI-008 dashboard UI with summary cards, recent usage table, loading, empty, and error states against the backend V1 APIs
- Added a live AEI-009 demo smoke command that sends one non-streaming OpenAI request through the proxy and verifies the new data through `/api/summary` and `/api/recent`
- Documented the full local V1 demo path, required environment variables, Supabase API-key setup, and dashboard refresh step
- Verified the full V1 demo path with one real OpenAI request, one Supabase `usage_logs` row, and the dashboard showing the new recent usage row
- Completed the V1 prototype epic locally; the remaining work is tracker/release cleanup and V2 task selection
- Restored local GitHub CLI authentication for `arwinazizi` using GitHub CLI plain-file credential storage after the Windows credential-store login flow failed to persist a readable token
- Created GitHub issue #15 / AEI-013 for the first V2 pilot-readiness task: organizations and tenant-scoped API keys
- Completed V2 organizations and tenant-scoped API keys (#15, #17)
- Applied Supabase tenant migration `0003_organizations_tenant_scope.sql` to the linked `ai-energy-intelligence` project
- Created GitHub issue #18 / AEI-014 for V2 dashboard login
- Created GitHub issue #19 / AEI-015 for the next V2 pilot-readiness task: CSV export
- Completed V2 dashboard login (#18, #20)

## In Progress

- AEI-015 / #19: V2 CSV export, implemented on `codex/aei-015-csv-export` pending review.

## Next

- Review and finish AEI-015 CSV export (#19).

## Later
- Multi-provider support.
- Streaming usage extraction/logging.

## Risks / Blockers

- GitHub CLI browser login reports success but does not persist a valid token in `hosts.yml`; GitHub connector access is working.
- Supabase CLI migration history did not recognize the existing `0001_...` migration filenames as pending remote migrations, so `0003` was applied directly with `supabase db query --linked --file`.

## Decisions

- GitHub issues are the source of truth for work tracking
- `docs/project-status.md` and `docs/issue-register.md` mirror GitHub state for local agent recovery
- The backend loads `.env` from the repository root for local development
- AEI-006 was intentionally completed before AEI-004, so persistence now builds on the shared calculator output
- `usage_logs.total_tokens` is generated by the database, so the backend insert sends `input_tokens` and `output_tokens` and lets Supabase compute the total
- V1 API keys are stored as SHA-256 hex hashes in `public.api_keys.key_hash` and are sent by clients with `x-api-key`
- V2 API-key validation resolves each valid key to `public.api_keys.organization_id`
- V2 non-streaming usage logs include `usage_logs.organization_id`
- V2 summary and recent APIs require `x-api-key` and filter reads by the resolved organization
- Streaming/SSE OpenAI responses are pass-through only and are not logged in V1
- `usage_logs.cost_usd` preserves the calculator's 12-decimal output in Supabase
- Dashboard login uses a minimal configured pilot credential and an HttpOnly signed session cookie; local/pilot dashboard API reads still send `VITE_AEI_CLIENT_API_KEY`
- AEI-015 CSV export reuses the same `x-api-key` tenant scoping as summary/recent reads and does not change those JSON APIs
