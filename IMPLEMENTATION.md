# IMPLEMENTATION.md

## Full Roadmap: V0 -> V4

## 1. Product vision

AI Energy Intelligence is a proxy-based measurement layer for AI usage.

It sits between applications and AI providers to:

- intercept every API call
- extract usage (tokens, latency)
- calculate cost
- estimate energy and CO2
- store and expose this data

### Core principle

You cannot optimize what you cannot measure.

This system creates the measurement layer that does not exist today.

## 2. System positioning

### What we actually build (technical reality)

- Express reverse proxy
- request/response logger
- calculation engine
- dashboard

### How it is framed (strategy)

- infrastructure layer
- measurement standard
- ESG enabler
- system-level innovation

Both are true. One proves the other.

## 3. Maturity ladder (V0 -> V4)

### V0 - Concept demo

Goal: Explain the idea instantly.

Build:

- static React page
- fake data
- architecture diagram
- "before vs after" explanation

Output:

- visual pitch
- internal alignment (Axeliq)

### V1 - Working prototype (current target)

Goal: Prove real measurement works.

Build:

- Express proxy
- OpenAI only
- API key auth (simple)
- Supabase logging
- real token extraction
- cost + energy calculation
- streaming/SSE pass-through without V1 usage logging
- minimal dashboard

Output:

- real API call -> real log -> real dashboard
- demo video

### V2 - Pilot-ready MVP

Goal: Safe external testing.

Add:

- organizations table
- hashed API keys (proper)
- dashboard auth
- CSV export
- improved logging reliability
- clearer methodology docs

### V3 - Working product

Goal: Multiple companies use it.

Add:

- multi-tenant system
- API key management UI
- Anthropic + others
- streaming usage extraction and logging
- alerts + thresholds
- better analytics

### V4 - Infrastructure layer

Goal: Industry-level system.

Add:

- carbon intensity by region
- reporting standards
- compliance exports
- SDKs
- enterprise security

## 4. Current focus: V1

This document describes the full system, but the current implementation target is:

**V1 Working Prototype**

## 5. High-level architecture

```text
Client Apps
     |
     v
Proxy (Express)
     |
     v
AI Provider (OpenAI)
     |
     v
Response returned

     |
     v
Async logging
     |
     v
Database (Supabase)
     |
     v
Dashboard (React)
```

## 6. Request lifecycle

1. client sends request to proxy
2. proxy parses provider + path
3. proxy forwards request
4. provider processes request (slow step)
5. provider returns response
6. proxy streams upstream bytes to the client unchanged
7. for non-streaming JSON responses only, proxy extracts from a bounded tee:
   - tokens
   - model
8. proxy calculates:
   - cost
   - energy
   - CO2
9. proxy logs asynchronously after ending the client response

Streaming/SSE responses are pass-through only in V1 and skip usage extraction, calculation, and persistence.

## 7. Tech stack

### Backend

- Node.js
- TypeScript
- Express

### Database

- Supabase (PostgreSQL)

### Frontend

- React
- Vite
- charting library only if AEI-008 needs it

### Deployment

- Railway (backend)
- Vercel (frontend)

## 8. Repo structure

```text
ai-energy-intelligence/

apps/
  backend/
    proxy/
    logging/
    calculator/
    api/
    db/

  dashboard/

packages/
  shared/

supabase/
  migrations/

docs/
scripts/
```

## 9. Database design

### V1 minimal schema

#### `api_keys`

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `usage_logs`

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider TEXT,
  model TEXT,
  endpoint TEXT,

  input_tokens INT,
  output_tokens INT,
  total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  cost_usd NUMERIC(18, 12),
  energy_kwh NUMERIC,
  co2_grams NUMERIC,

  latency_ms INT,
  status_code INT,

  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 10. Core system components

### 10.1 Proxy handler

Responsibilities:

- parse request
- determine provider
- forward request
- receive response
- extract usage
- trigger logging
- return response

### 10.2 Provider abstraction

```ts
const provider = {
  baseUrl,
  authHeader,
  apiKey,
  extractInputTokens(),
  extractOutputTokens(),
};
```

### 10.3 Auth middleware

- reads `x-api-key`
- hashes it
- validates against DB
- allows or rejects

### 10.4 Logger

- receives usage data
- calculates cost/energy
- inserts into DB
- async execution

### 10.5 Calculator

#### Cost

```text
cost = (input_tokens / 1000 * input_price)
     + (output_tokens / 1000 * output_price)
```

#### Energy

```text
energy = tokens * estimated_energy_per_token
```

#### CO2

```text
co2 = energy * carbon_intensity
```

## 11. REST API (V1)

Minimal only:

- `GET /api/summary`
- `GET /api/recent`

No multi-tenant logic yet.

## 12. Dashboard (V1)

One page only.

Components:

- total tokens
- total cost
- total energy
- total CO2
- recent logs table

## 13. Authentication model (V1)

- single API key
- stored hashed
- sent via header

No user login yet.

## 14. Build phases

### Phase 1 - Proxy only

- Express server
- `/openai/*` route
- forward request
- return response

### Phase 2 - Token extraction

- parse response
- extract tokens
- log to console

### Phase 3 - Database

- setup Supabase
- create tables
- insert logs

### Phase 4 - Auth

- implement API key validation

### Phase 5 - Calculation

- add cost
- add energy
- add CO2

### Phase 6 - Dashboard

- build simple UI
- fetch summary + recent logs

### Phase 7 - Demo

- record full flow

## 15. Deployment

### Backend

Railway

Environment variables:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

### Frontend

Vercel

## 16. Testing strategy

Minimum:

- manual test script
- one real API call
- verify DB insert
- use `npm.cmd` for workspace scripts on Windows

## 17. Risks

| Risk | Mitigation |
| --- | --- |
| CO2 inaccurate | frame as estimate |
| proxy breaks requests | return untouched response |
| logging fails | async, non-blocking |
| overengineering | strict V1 scope |

## 18. What matters vs noise

### Matters

- working proxy
- real data flow
- clean architecture
- demo

### Noise

- perfect UI
- exact carbon science
- multi-provider early
- scaling

## 19. Personal leverage

This project proves:

- backend system design
- real-world architecture
- infrastructure thinking

Narrative:

"I build systems that measure invisible behavior."

## 20. Next step

The proxy pass-through, non-streaming usage extraction, impact calculation, Supabase logging, API-key validation, and streaming/SSE pass-through behavior are complete. Next backend step:

**summary APIs -> recent logs -> dashboard data**

Everything else builds on that.
