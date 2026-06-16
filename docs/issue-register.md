# Issue Register

This is the local mirror of the GitHub issue tracker. GitHub issues are the source of truth; update this file when issue status or numbering changes so agents can recover context from the repository alone.

Current owner-facing state: all implementation tasks through AEI-016 are done. AEI-017 is the active V2 pilot-readiness task. AEI-000 is the ongoing tracker.

| Local ID | Status | Title | Purpose | GitHub Issue |
| --- | --- | --- | --- | --- |
| AEI-000 | In Progress | Program Tracker | Single place to read done, doing, next, blockers, and decisions. | #2 |
| AEI-001 | Done | V1 Prototype Epic | Own the end-to-end V1 scope. | #3 |
| AEI-002 | Done | Proxy Pass-Through | Forward one real OpenAI request unchanged through Express. | #4 |
| AEI-003 | Done | Usage Extraction | Parse model, tokens, and latency from OpenAI responses. | #5 |
| AEI-004 | Done | Supabase Persistence | Insert usage rows for extracted usage and calculated impact values. | #6 |
| AEI-005 | Done | API Key Validation | Validate a shared API key via hashed lookup. | #7 |
| AEI-006 | Done | Cost / Energy / CO2 Calculation | Compute V1 estimates from usage events. | #8 |
| AEI-007 | Done | Summary API | Expose `GET /api/summary` and `GET /api/recent`. | #9 |
| AEI-008 | Done | Dashboard UI | Render summary cards and recent logs table. | #10 |
| AEI-009 | Done | Smoke Test And Demo Path | Prove one request flows through proxy to log to dashboard. | #11 |
| AEI-010 | Done | GitHub CLI Auth Cleanup | Re-authenticate local `gh` for CLI-only GitHub workflows. | #12 |
| AEI-011 | Done | V0 Static Concept Demo | Build a static React page that explains the measurement-layer idea with fake data and architecture. | #13 |
| AEI-012 | Done | Review Fixes: Streaming Proxy / Cost Precision / Windows Scripts | Address review findings for safe streaming pass-through, Supabase cost precision, and Windows npm scripts. | #14 |
| AEI-013 | Done | V2: Organizations and Tenant-Scoped API Keys | Add organizations, resolve API keys to tenants, write tenant-scoped usage logs, and filter summary APIs by organization. | #15 |
| AEI-014 | Done | V2: Dashboard Login | Protect the dashboard behind a minimal pilot login while preserving tenant-scoped backend APIs. | #18 |
| AEI-015 | Done | V2: CSV Export | Export tenant-scoped recent usage data as CSV while preserving existing summary and recent APIs. | #19 |
| AEI-016 | Done | V2: Dashboard CSV Download Action | Add an authenticated dashboard control that downloads the tenant-scoped CSV export. | #24 |
| AEI-017 | In Progress | V2: Logging Reliability Hardening | Make async usage-log persistence failures visible and boundedly recoverable while preserving proxy pass-through behavior. | #26 |

## Rules

- Keep statuses limited to `Todo`, `In Progress`, `Blocked`, and `Done`.
- At most one implementation task issue should be `In Progress` at a time; AEI-017 is currently active.
- Keep this file aligned with GitHub issue state.
