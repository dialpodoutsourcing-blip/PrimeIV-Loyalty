-- GoHighLevel connection settings, isolated per spa.
-- Run once in Supabase SQL Editor after the multi-spa migration.
begin;

create table if not exists public.ghl_connections (
  spa_id uuid primary key references public.spas(id) on delete cascade,
  location_id text not null,
  pit_key_encrypted text not null,
  spa_visits_field_id text,
  last_spa_visits_field_id text,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ghl_location_id_not_blank check (btrim(location_id) <> ''),
  constraint ghl_pit_key_not_blank check (btrim(pit_key_encrypted) <> '')
);

alter table public.ghl_connections
  add column if not exists spa_visits_field_id text,
  add column if not exists last_spa_visits_field_id text;

comment on column public.ghl_connections.spa_visits_field_id is
  'GoHighLevel contact custom-field ID for Spa_Visits.';
comment on column public.ghl_connections.last_spa_visits_field_id is
  'GoHighLevel contact custom-field ID for Last_Spa_Visits.';

drop trigger if exists ghl_connections_set_updated_at on public.ghl_connections;
create trigger ghl_connections_set_updated_at before update on public.ghl_connections
for each row execute function public.set_updated_at();

alter table public.ghl_connections enable row level security;
revoke all on public.ghl_connections from public, anon, authenticated;

comment on column public.ghl_connections.pit_key_encrypted is
  'AES-GCM encrypted by the server using GHL_ENCRYPTION_KEY. Never expose through browser queries.';

commit;
