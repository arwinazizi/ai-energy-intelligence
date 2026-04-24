# GitHub Bootstrap

This document exists so the remote setup can be recovered quickly if the local environment forgets its GitHub authentication state.

## Current Situation

- local Git is initialized
- local `main` has the bootstrap commit
- GitHub CLI is installed
- GitHub CLI authentication is currently invalid in this environment

## Recovery Steps

1. Re-authenticate GitHub CLI:

```powershell
gh auth logout -h github.com -u arwinazizi
gh auth login --web --git-protocol https
gh auth status
```

2. Create the remote repository and attach `origin`:

```powershell
gh repo create arwinazizi/ai-energy-intelligence --private --source=. --remote=origin --push --description "Proxy-based measurement layer for AI usage" --disable-wiki
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
- the GitHub repository should contain the bootstrap commit
- the issue list should match `docs/issue-register.md`
