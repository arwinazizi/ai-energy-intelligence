# AEI-017: V2 Logging Reliability Hardening

Status: In Progress, implemented locally with draft PR open
GitHub Issue: #26
Tracker: #2
GitHub PR: #27, draft

## Scope

Make async usage-log persistence failures visible and boundedly recoverable while preserving the OpenAI proxy pass-through contract.

## Implementation

- Kept usage extraction and Supabase persistence asynchronous after the upstream response completes.
- Added a bounded two-attempt usage-log persistence path with one short retry after the first insert failure.
- Replaced the proxy-local unstructured persistence warning with structured warning output from `logUsage`.
- Included provider, endpoint, organization ID, upstream status code, attempt count, retry decision, and shaped error details in persistence warnings.
- Kept secrets and full request/response bodies out of logging warnings.
- Added focused smoke coverage proving the proxied response still reaches the client unchanged when the first persistence attempt fails and the retry succeeds.
- Updated existing usage extraction smoke coverage for the fully failed bounded retry path.

## Out Of Scope

- Durable queues or worker infrastructure.
- Dashboard alerting or new dashboard screens.
- Supabase schema changes.
- Provider expansion.
- Streaming/SSE usage extraction or logging.

## Verification

Passed locally on 2026-06-16 before opening PR #27:

- `npm.cmd run build:backend`
- `npm.cmd --workspace @aei/backend run smoke:usage`
- `npm.cmd --workspace @aei/backend run smoke:logging-reliability`
- `npm.cmd --workspace @aei/backend run smoke:auth`
- `npm.cmd --workspace @aei/backend run smoke:summary`
- `npm.cmd --workspace @aei/backend run smoke:csv-export`
- `npm.cmd --workspace @aei/backend run smoke:dashboard-auth`

Refs #2
