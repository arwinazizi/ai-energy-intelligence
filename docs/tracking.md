# Tracking System

This project should remain understandable even if all short-term memory is gone. The operating rule is simple: the current state must be recoverable from the repository and GitHub issues alone.

## Source Of Truth

- Git history answers: what changed
- GitHub issues answer: what is planned, active, blocked, and done
- `IMPLEMENTATION.md` answers: why the system exists and the target architecture
- `docs/v1-build-plan.md` answers: the intended execution order for V1

## Non-Negotiable Rules

1. No material work starts without an issue.
2. At most one implementation issue is active at any given time; between completed tasks, no implementation issue may be active.
3. Every completed task updates the tracker issue before moving on.
4. Scope changes are written down in the issue or docs the same session they are discovered.
5. Commits and pull requests must reference the issue they advance or close.

## Minimal Workflow

1. Open or update the tracker issue.
2. Before material work starts, create or pick exactly one active task issue.
3. Do the work on a branch that references the issue number.
4. Commit with the issue number in the message.
5. Close the issue only after verification is written down.

## Tracker Issue Layout

The tracker issue should always contain these sections:

- Done
- In Progress
- Next
- Later
- Risks / Blockers
- Decisions

If tracker issue #2 is current, a fresh read of that one issue plus the open issue list is enough to recover context.

## Initial Issue Taxonomy

- one tracker issue for whole-program status
- one epic issue for V1 prototype
- one task issue per bounded implementation step
- bug issues for regressions and defects

## First Recovery Checklist

If context is lost, read these in order:

1. `README.md`
2. `IMPLEMENTATION.md`
3. `docs/tracking.md`
4. GitHub tracker issue #2
5. open GitHub issues sorted by update time
6. `docs/project-status.md` and `docs/issue-register.md` as local mirrors
