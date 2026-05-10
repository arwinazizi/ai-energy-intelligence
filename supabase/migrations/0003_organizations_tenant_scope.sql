create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists organizations_slug_idx
  on public.organizations (slug);

insert into public.organizations (name, slug)
values ('Default Organization', 'default')
on conflict (slug) do nothing;

alter table public.api_keys
  add column if not exists organization_id uuid;

alter table public.usage_logs
  add column if not exists organization_id uuid;

update public.api_keys
set organization_id = (select id from public.organizations where slug = 'default')
where organization_id is null;

update public.usage_logs
set organization_id = (select id from public.organizations where slug = 'default')
where organization_id is null;

alter table public.api_keys
  alter column organization_id set not null;

alter table public.usage_logs
  alter column organization_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'api_keys_organization_id_fkey'
      and conrelid = 'public.api_keys'::regclass
  ) then
    alter table public.api_keys
      add constraint api_keys_organization_id_fkey
      foreign key (organization_id)
      references public.organizations (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'usage_logs_organization_id_fkey'
      and conrelid = 'public.usage_logs'::regclass
  ) then
    alter table public.usage_logs
      add constraint usage_logs_organization_id_fkey
      foreign key (organization_id)
      references public.organizations (id);
  end if;
end $$;

create index if not exists api_keys_organization_id_idx
  on public.api_keys (organization_id);

create index if not exists usage_logs_organization_created_at_idx
  on public.usage_logs (organization_id, created_at desc);
