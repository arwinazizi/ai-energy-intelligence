# Issue Register

This is the local mirror of the GitHub issue tracker. GitHub issues are the source of truth; update this file when issue status or numbering changes so agents can recover context from the repository alone.

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
| AEI-013 | In Progress | V2: Organizations and Tenant-Scoped API Keys | Add organizations, resolve API keys to tenants, write tenant-scoped usage logs, and filter summary APIs by organization. | #15 |

## Rules

- Keep statuses limited to `Todo`, `In Progress`, `Blocked`, and `Done`.
- Only one task issue should be `In Progress` at a time.
- Keep this file aligned with GitHub issue state.
