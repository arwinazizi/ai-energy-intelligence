# GitHub Bootstrap

This document exists so the remote setup can be recovered quickly if the local environment forgets its GitHub authentication state.

## Current Situation

- local Git is initialized
- `origin` points to `https://github.com/arwinazizi/ai-energy-intelligence.git`
- local `main` tracks the GitHub remote
- GitHub tracker, V1 epic, and task issues have been seeded
- GitHub CLI is installed
- GitHub CLI authentication succeeds for `arwinazizi`
- This environment required GitHub CLI plain-file credential storage because the normal Windows credential-store flow completed but did not persist a readable token

## Recovery Steps

1. Verify GitHub CLI authentication before CLI-only actions:

```powershell
gh auth status
```

2. If authentication is lost, try the normal GitHub CLI web login first:

```powershell
gh auth logout -h github.com -u arwinazizi
gh auth login -h github.com --web --git-protocol https
gh auth status
```

3. If the browser login reports success but `gh auth status` still fails, use the plain-file fallback only after accepting that the token will be stored in `C:\Users\Arwin\AppData\Roaming\GitHub CLI\hosts.yml`:

```powershell
gh auth logout -h github.com -u arwinazizi
gh auth login -h github.com --web --git-protocol https --insecure-storage
gh auth status
```

4. Verify the existing remote and branch sync:

```powershell
git remote -v
git status --branch --short
```

5. Verify the initial issue set exists:

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
- GitHub CLI Auth Cleanup

## Verification

Current verified state:

- `gh auth status` succeeds for `arwinazizi`
- `git remote -v` should show `origin`
- local `main` should be in sync with `origin/main`
- the issue list should match `docs/issue-register.md`
