# Dashboard

The dashboard is intentionally narrow for pilot readiness. It answers:

- how many tokens were processed
- what that cost
- what the estimated energy and CO2 were
- what the latest requests looked like
- a CSV export of tenant-scoped recent usage

It now sits behind the minimal pilot login added in AEI-014 and exposes the completed AEI-015 CSV export endpoint through the AEI-016 download action.

## Pilot Login

The dashboard checks `GET /api/dashboard/session` before rendering metrics or recent usage rows. Unauthenticated visitors see the login view only. A successful login sets the backend's HttpOnly dashboard session cookie, then the dashboard loads the existing tenant-scoped summary and recent APIs.

Required local environment:

- backend: `DASHBOARD_PILOT_USERNAME` plus `DASHBOARD_PILOT_PASSWORD` or `DASHBOARD_PILOT_PASSWORD_SHA256`
- backend: `DASHBOARD_SESSION_SECRET`
- backend: `DASHBOARD_CORS_ORIGIN` when the dashboard is not served from the backend origin
- dashboard: `VITE_API_BASE_URL`
- dashboard: `VITE_AEI_CLIENT_API_KEY` for the tenant-scoped summary, recent API reads, and CSV export

## Current Boundary

The backend exposes tenant-scoped CSV export at `GET /api/usage.csv`. The dashboard downloads it with `fetch`, `x-api-key`, a Blob/object URL, and a temporary download link because a normal anchor link cannot attach the required API-key header.

## Suggested First Files

- `src/App.tsx`
- `src/styles.css`
