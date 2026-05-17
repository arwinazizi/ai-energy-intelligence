# AEI-015: V2 CSV Export

Status: In Progress, implemented on `codex/aei-015-csv-export` pending review
GitHub Issue: #19
Tracker: #2

## Scope

Add a practical pilot CSV export for tenant-scoped usage data without changing the existing summary and recent dashboard APIs.

## Implementation

- Added `GET /api/usage.csv` for bounded tenant-scoped usage-log CSV export.
- Reused the existing `x-api-key` validation and organization resolution path used by `GET /api/summary` and `GET /api/recent`.
- Kept `GET /api/summary` and `GET /api/recent` JSON behavior unchanged.
- Added structured CSV serialization with correct escaping for commas, quotes, and newlines.
- Added focused smoke coverage for missing, invalid, and valid tenant credentials plus CSV headers, scoping, ordering, limit, and escaping.

## Out Of Scope

- Dashboard export UI.
- Scheduled reports or email delivery.
- Compliance-grade exports, audit packages, or long-term archival workflows.
- Advanced filtering, saved report definitions, custom columns, or pagination beyond the bounded pilot export.
- Changing or replacing existing `GET /api/summary` and `GET /api/recent` APIs.
- Multi-provider expansion beyond whatever usage rows already store.

## Verification

Passed locally on 2026-05-17:

- `npm.cmd run build:backend`
- `npm.cmd --workspace @aei/backend run smoke:summary`
- `npm.cmd --workspace @aei/backend run smoke:csv-export`

Refs #2
