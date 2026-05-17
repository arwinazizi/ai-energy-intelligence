# AEI-013: V2 Organizations and Tenant-Scoped API Keys

Status: Done, completed and closed in GitHub issue #15
GitHub Issue: #15
GitHub PR: #17, merged

## Scope

Add the first V2 pilot-readiness slice:

- `organizations` table
- `api_keys.organization_id`
- `usage_logs.organization_id`
- API-key validation that resolves a valid `x-api-key` to its owning organization
- tenant-scoped non-streaming usage logging
- tenant-scoped `GET /api/summary` and `GET /api/recent`

## Completed

- Added Supabase migration for `organizations`, `api_keys.organization_id`, and `usage_logs.organization_id`
- Resolved a valid `x-api-key` to its owning organization
- Included `organization_id` in non-streaming proxy usage logs
- Required `x-api-key` for `GET /api/summary` and `GET /api/recent`
- Filtered summary and recent data by the resolved organization
- Added smoke coverage for tenant scoping
- Applied `supabase/migrations/0003_organizations_tenant_scope.sql` to the linked `ai-energy-intelligence` Supabase project
- Merged PR #17

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
