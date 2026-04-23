# V1 Architecture

## System View

```mermaid
flowchart TD
    client["Client App"] --> auth["API Key Validation"]
    auth --> proxy["Express Proxy"]
    proxy --> openai["OpenAI API"]
    openai --> proxy
    proxy --> extractor["Usage Extraction"]
    extractor --> calculator["Cost / Energy / CO2 Calculator"]
    calculator --> db[("Supabase")]
    db --> dashboard["React Dashboard"]
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Proxy
    participant OpenAI
    participant Logger
    participant DB as Supabase

    Client->>Proxy: Request + x-api-key
    Proxy->>OpenAI: Forward upstream request
    OpenAI-->>Proxy: Response + usage metadata
    Proxy->>Logger: Async log payload
    Proxy-->>Client: Return upstream response unchanged
    Logger->>DB: Insert usage log + estimates
```

## V1 Boundaries

- OpenAI is the only provider in scope.
- Logging is async and must not block the client response path.
- Energy and CO2 are estimates, not scientific claims.
- Dashboard scope is one page: summary cards plus recent logs.

## Component Responsibilities

- `apps/backend`: proxy, auth, provider adapter, calculation, REST endpoints
- `apps/dashboard`: read-only V1 UI
- `packages/shared`: shared types, constants, and DTOs
- `supabase/migrations`: schema and later seed or policy changes
