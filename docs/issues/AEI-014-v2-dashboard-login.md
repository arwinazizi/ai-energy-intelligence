# AEI-014: V2 Dashboard Login

Status: Done, completed and closed in GitHub issue #18
GitHub Issue: #18
Tracker: #2
GitHub PR: #20, merged

## Scope

Protect the pilot dashboard behind a minimal login flow while preserving the tenant-scoped backend APIs added in AEI-013.

## Implementation

- Added backend dashboard session endpoints under `/api/dashboard`.
- Added a configured pilot username/password login that sets an HttpOnly signed session cookie.
- Added dashboard session check, login, and logout states before the existing dashboard view can render.
- Kept dashboard summary and recent reads on the existing `GET /api/summary` and `GET /api/recent` paths with `x-api-key`.
- Added focused smoke coverage for the dashboard login/session/logout behavior.
- Merged PR #20.

## Out Of Scope

- Production user, organization, invite, role, or membership management.
- Organization switching in the dashboard.
- API-key management UI or customer self-service provisioning.
- Changing the tenant-scoped backend API contract.
- CSV export, multi-provider support, or streaming usage extraction.

## Verification

Passed locally on 2026-05-17:

- `npm.cmd run build:dashboard`
- `npm.cmd run build:backend`
- `npm.cmd --workspace @aei/backend run smoke:dashboard-auth`
- `npm.cmd --workspace @aei/backend run smoke:summary`
- `npm.cmd --workspace @aei/backend run smoke:auth`

Refs #2
