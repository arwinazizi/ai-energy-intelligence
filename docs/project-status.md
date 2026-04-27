# Project Status

This file is the local fallback tracker until the GitHub repository exists and the tracker issue is created there. After GitHub is active, this should mirror the tracker issue rather than diverge from it.

## Done

- Wrote the initial product and V1 implementation brief in `IMPLEMENTATION.md`
- Created the repository scaffold for backend, dashboard, shared package, Supabase, docs, and scripts
- Added architecture and build-plan documentation
- Added issue templates, PR template, and tracking rules
- Initialized local Git on `main`
- Created local issue `AEI-011` for the V0 static concept demo
- Built the V0 dashboard concept page in `apps/dashboard`
- Created local issue `AEI-002` for proxy pass-through
- Built the smallest Express backend proxy for `/openai/*`
- Verified the proxy against a fake upstream for method, path/query, headers, body, status, and response headers
- Verified a live OpenAI `/v1/models` request through the proxy using the gitignored root `.env`

## In Progress

- No local implementation task is currently active.

## Next

- AEI-003: Usage Extraction

## Later

- Re-authenticate GitHub CLI
- Publish the local repository to GitHub
- Create tracker and V1 epic issues
- Recreate local issues as GitHub issues once the remote repository exists
- Supabase integration
- API key authentication
- dashboard summary endpoints
- dashboard UI
- smoke test and demo path

## Risks / Blockers

- `gh` is installed but the stored token is invalid in this environment, so GitHub repository creation is currently blocked
- GitHub issue creation depends on the remote repository existing first
- V0 issue is tracked locally as `AEI-011` until GitHub is available
- GitHub bootstrap is blocked while V1 implementation proceeds from the local tracker

## Decisions

- GitHub issues will be the long-term source of truth for work tracking
- Until the remote exists, `docs/project-status.md` and `docs/issue-register.md` are the fallback source of truth
- The backend loads `.env` from the repository root for local development
