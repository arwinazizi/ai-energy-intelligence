# AEI-003: Usage Extraction

Status: Done

## Purpose

Extract usage metadata from non-streaming OpenAI JSON responses while continuing to return the upstream response to the client unchanged.

## Scope

- Extract the upstream endpoint.
- Extract the upstream response status code.
- Measure proxy latency in milliseconds.
- Extract `model` from JSON responses when present.
- Extract `input_tokens`, `output_tokens`, and `total_tokens` from OpenAI usage payloads.
- Support both OpenAI Responses API token field names and chat completion token field names.
- Log the extracted usage payload to the backend console only.
- Add a repeatable fake-upstream smoke test for the extraction path.

## Out Of Scope

- Supabase persistence
- API key authentication
- Cost, energy, or CO2 calculations
- Dashboard APIs
- Streaming response usage extraction or persistence

## Acceptance Criteria

- The client receives the upstream status code unchanged.
- The client receives the upstream raw response body unchanged.
- Non-streaming JSON responses with usage data produce a console usage payload containing `endpoint`, `status_code`, `latency_ms`, `model`, `input_tokens`, `output_tokens`, and `total_tokens`.
- `npm run build:backend` succeeds.
- The fake-upstream smoke test succeeds.

## Verification

- `npm.cmd run build:backend` passed.
- `npm.cmd --workspace @aei/backend run smoke:usage` passed against a fake upstream.
- The first smoke test attempt failed inside the sandbox with `spawn EPERM` from `tsx`; rerunning the same command with escalation passed.

## GitHub

Tracked in GitHub issue #5. Closed as completed.
