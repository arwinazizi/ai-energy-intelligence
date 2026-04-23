# Backend

The backend owns the V1 critical path:

- validate the shared API key
- proxy OpenAI requests
- extract usage and latency
- calculate cost, energy, and CO2
- log asynchronously
- expose summary endpoints for the dashboard

## Suggested First Files

- `src/index.ts`
- `src/proxy/openaiProxy.ts`
- `src/providers/openai.ts`
- `src/auth/validateApiKey.ts`
- `src/logging/logUsage.ts`
- `src/calculator/calculateImpact.ts`
- `src/api/summary.ts`
- `src/db/supabase.ts`
