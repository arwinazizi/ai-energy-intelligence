create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists api_keys_key_hash_idx
  on public.api_keys (key_hash);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text,
  endpoint text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer generated always as (input_tokens + output_tokens) stored,
  cost_usd numeric(12, 6) not null default 0,
  energy_kwh numeric(12, 9) not null default 0,
  co2_grams numeric(12, 6) not null default 0,
  latency_ms integer,
  status_code integer not null,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_created_at_idx
  on public.usage_logs (created_at desc);

create index if not exists usage_logs_provider_model_idx
  on public.usage_logs (provider, model);
