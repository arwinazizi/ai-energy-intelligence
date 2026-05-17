# V1 Demo Path

This is a historical V1 demo path. It remains useful for proving the original request -> proxy -> Supabase -> dashboard data flow, but it is not the full current V2 pilot-readiness state.

AEI-009 proves the local V1 path end to end:

```text
non-streaming OpenAI request -> Express /openai proxy -> Supabase usage_logs row -> dashboard summary/recent APIs
```

## Required Local Environment

Use the gitignored root `.env` file. Do not commit real keys.

```bash
PORT=4000
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
AEI_CLIENT_API_KEY=local-demo-key-change-me
AEI_API_BASE_URL=http://127.0.0.1:4000
AEI_DEMO_MODEL=gpt-4.1-mini
```

`AEI_CLIENT_API_KEY` is the raw client key sent to the proxy and summary APIs as `x-api-key`. The backend authorizes it by checking the SHA-256 hash in `public.api_keys.key_hash` and resolving the owning organization.

One-time Supabase setup:

1. Apply `supabase/migrations/0001_v1_init.sql`.
2. Apply `supabase/migrations/0002_usage_log_cost_precision.sql`.
3. Apply `supabase/migrations/0003_organizations_tenant_scope.sql`.
4. Insert the hash of your local client key for the default organization in Supabase SQL editor:

```sql
insert into public.api_keys (key_hash, organization_id)
select encode(digest('local-demo-key-change-me', 'sha256'), 'hex'), id
from public.organizations
where slug = 'default'
on conflict (key_hash) do nothing;
```

Use the same raw value in `AEI_CLIENT_API_KEY`. Replace `local-demo-key-change-me` with your own local demo key before running the SQL.

## Command Path

Build both apps:

```bash
npm.cmd run build:backend
npm.cmd run build:dashboard
```

Run the existing fake-Supabase Summary API smoke:

```bash
npm.cmd --workspace @aei/backend run smoke:summary
```

Start the backend in one terminal:

```bash
npm.cmd run dev:backend
```

Run the live AEI-009 demo smoke in a second terminal:

```bash
npm.cmd --workspace @aei/backend run smoke:demo
```

The demo smoke assumes the backend is already listening at `AEI_API_BASE_URL`, sends one non-streaming `POST /openai/v1/chat/completions` request with `x-api-key`, waits for tenant-scoped `/api/summary` to show one additional request, then verifies the newest tenant-scoped `/api/recent` row matches the OpenAI response usage.

Start the dashboard:

```bash
npm.cmd run dev:dashboard
```

Open the Vite URL printed by the dashboard command. The dashboard defaults to `http://127.0.0.1:4000` for API reads; set `VITE_API_BASE_URL` if the backend uses another port and `VITE_AEI_CLIENT_API_KEY` to send the protected summary API key. In the current V2 state, the dashboard also requires the configured pilot login before metrics render.

## Expected Result

The smoke command prints:

```text
AEI-009 live demo smoke passed
Summary request_count: N -> N+1
Newest recent row: provider=openai model=... endpoint=/v1/chat/completions tokens=...
```

The dashboard should then show the updated totals and the new row in the recent usage log table after refresh.

## Scope Notes

- This is a live integration smoke and requires real OpenAI and Supabase credentials.
- The original AEI-009 smoke predates dashboard login and does not verify the login flow.
- It does not test or implement streaming usage logging.
- Existing fake-upstream smokes remain the repeatable no-secret tests for proxy, auth, persistence wiring, Summary API behavior, dashboard auth, and CSV export.
