# Issue Register

This is the bootstrap issue ledger before GitHub issue numbers exist. When the GitHub repository is available, each item should be recreated as a GitHub issue and the GitHub number should be added in the final column.

| Local ID | Status | Title | Purpose | GitHub Issue |
| --- | --- | --- | --- | --- |
| AEI-000 | In Progress | Program Tracker | Single place to read done, doing, next, blockers, and decisions. | Pending |
| AEI-001 | Todo | V1 Prototype Epic | Own the end-to-end V1 scope. | Pending |
| AEI-002 | Done | Proxy Pass-Through | Forward one real OpenAI request unchanged through Express. | Pending |
| AEI-003 | Done | Usage Extraction | Parse model, tokens, and latency from OpenAI responses. | Pending |
| AEI-004 | Done | Supabase Persistence | Insert usage rows and support summary queries. | Pending |
| AEI-005 | Todo | API Key Validation | Validate a shared API key via hashed lookup. | Pending |
| AEI-006 | Done | Cost / Energy / CO2 Calculation | Compute V1 estimates from usage events. | Pending |
| AEI-007 | Todo | Summary API | Expose `GET /api/summary` and `GET /api/recent`. | Pending |
| AEI-008 | Todo | Dashboard UI | Render summary cards and recent logs table. | Pending |
| AEI-009 | Todo | Smoke Test And Demo Path | Prove one request flows through proxy to log to dashboard. | Pending |
| AEI-010 | Blocked | GitHub Bootstrap | Repair `gh` auth, create remote, push `main`, and seed issues. | Pending |
| AEI-011 | Done | V0 Static Concept Demo | Build a static React page that explains the measurement-layer idea with fake data and architecture. | Pending |

## Rules

- Keep statuses limited to `Todo`, `In Progress`, `Blocked`, and `Done`.
- Only one task issue should be `In Progress` at a time.
- When GitHub issues exist, update this file with the real issue numbers or replace it with a GitHub-generated view.
