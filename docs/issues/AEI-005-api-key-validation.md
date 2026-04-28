# AEI-005: API Key Validation

Status: Done

GitHub Issue: #7

## Purpose

Validate a shared client API key before proxying OpenAI requests upstream.

## Scope

- Read the client API key from `x-api-key`.
- Hash the key with SHA-256.
- Check the hash against `public.api_keys.key_hash` through Supabase PostgREST.
- Reject missing or invalid keys with a small JSON 401 response.
- Ensure unauthorized requests do not reach the OpenAI upstream.
- Preserve authorized proxy behavior, non-streaming usage extraction, calculated impact values, and async usage logging.
- Add focused fake-upstream smoke coverage for missing, invalid, and valid keys.

## Out Of Scope

- Dashboard login.
- Key management UI.
- Multi-tenant organizations.
- Production key rotation flow.

## Acceptance Criteria

- Missing `x-api-key` receives a 401 response before any upstream request is made.
- Invalid `x-api-key` receives a 401 response before any upstream request is made.
- Valid `x-api-key` allows the request to reach the upstream.
- Authorized non-streaming JSON responses still produce usage logging.
- `npm.cmd run build:backend` succeeds.
- The fake-upstream auth smoke test succeeds.

## Verification

- `npm.cmd run build:backend` passed.
- `npm.cmd --workspace @aei/backend run smoke:auth` passed against fake upstream and fake Supabase servers.
- `npm.cmd --workspace @aei/backend run smoke:usage` passed after auth integration.
- Both `tsx` smoke commands may hit sandbox `spawn EPERM` in this environment; rerunning the same commands outside the sandbox passed.
