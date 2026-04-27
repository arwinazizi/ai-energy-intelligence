# GitHub Bootstrap

This document exists so the remote setup can be recovered quickly if the local environment forgets its GitHub authentication state.

## Current Situation

- local Git is initialized
- `origin` points to `https://github.com/arwinazizi/ai-energy-intelligence.git`
- local `main` is expected to track the GitHub remote
- GitHub CLI is installed
- GitHub CLI authentication is currently invalid in this environment

## Recovery Steps

1. Re-authenticate GitHub CLI:

```powershell
gh auth logout -h github.com -u arwinazizi
gh auth login --web --git-protocol https
gh auth status
```

2. Verify the existing remote and branch sync:

```powershell
git remote -v
git status --branch --short
```

3. Create the initial issue set:

- Program Tracker
- V1 Prototype Epic
- Proxy Pass-Through
- Usage Extraction
- Supabase Persistence
- API Key Validation
- Cost / Energy / CO2 Calculation
- Summary API
- Dashboard UI
- Smoke Test And Demo Path

## Verification

After recovery:

- `gh auth status` should succeed
- `git remote -v` should show `origin`
- local `main` should be in sync with `origin/main`
- the issue list should match `docs/issue-register.md`
