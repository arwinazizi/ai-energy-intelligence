# AEI-002: Proxy Pass-Through

Status: Done

## Purpose

Forward one real OpenAI request through the Express backend and return the upstream response without reshaping it.

## Scope

- Create the backend Express entry point.
- Add an `/openai/*` pass-through route.
- Forward the original method, path, query, headers, and body upstream, except hop-by-hop transport headers.
- Use `OPENAI_BASE_URL` when set, defaulting to `https://api.openai.com`.
- Use `OPENAI_API_KEY` as the upstream bearer token when set and the request does not already include `Authorization`.
- Return the upstream status, headers, and body to the caller.

## Out Of Scope

- API key validation
- Supabase persistence
- Usage extraction
- Cost, energy, or CO2 calculations
- Dashboard APIs

## Acceptance Criteria

- `npm run build:backend` succeeds.
- `GET /health` returns a small JSON health payload.
- A client can send an OpenAI-compatible request to `/openai/v1/...` and receive the upstream response.

## Verification

- `npm run build:backend` passed.
- Local smoke test passed using a fake upstream configured through `OPENAI_BASE_URL`.
- Real OpenAI smoke test passed through `/openai/v1/models` using the gitignored root `.env`.

## GitHub

Pending. Recreate this as a GitHub issue when the remote repository exists.
