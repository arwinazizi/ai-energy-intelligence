# AEI-013: V2 Organizations and Tenant-Scoped API Keys

Status: In Progress, implemented on `codex/v2-organizations-tenant-api-keys` pending PR review/merge
GitHub Issue: #15

## Scope

Add the first V2 pilot-readiness slice:

- `organizations` table
- `api_keys.organization_id`
- `usage_logs.organization_id`
- API-key validation that resolves a valid `x-api-key` to its owning organization
- tenant-scoped non-streaming usage logging
- tenant-scoped `GET /api/summary` and `GET /api/recent`

## Out Of Scope

- Dashboard login
- CSV export
- Multi-provider support
- Streaming/SSE usage logging

## Verification

- `npm.cmd run build:backend` passed
- `npm.cmd run build:dashboard` passed
- `npm.cmd --workspace @aei/backend run smoke:auth` passed
- `npm.cmd --workspace @aei/backend run smoke:usage` passed
- `npm.cmd --workspace @aei/backend run smoke:summary` passed
