# Supabase

This directory holds database assets for the V1 prototype and V2 pilot-readiness migrations.

Start with:

- the minimal schema in `migrations/0001_v1_init.sql`
- the cost precision follow-up in `migrations/0002_usage_log_cost_precision.sql`
- the organization and tenant-scope migration in `migrations/0003_organizations_tenant_scope.sql`

Current scope boundaries:

- no dashboard auth tables yet
- no scheduled export/reporting pipeline yet; the pilot CSV export endpoint is implemented in the backend
- no streaming usage logging yet
