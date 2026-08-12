-- Durable per-customer GoHighLevel linkage and sync state.
begin;

alter table public.profiles
  add column if not exists ghl_contact_id text,
  add column if not exists ghl_sync_status text not null default 'pending',
  add column if not exists ghl_synced_at timestamptz,
  add column if not exists ghl_sync_error text;

create unique index if not exists profiles_spa_ghl_contact_unique
  on public.profiles(spa_id, ghl_contact_id)
  where ghl_contact_id is not null;

create index if not exists profiles_spa_ghl_status_idx
  on public.profiles(spa_id, ghl_sync_status);

commit;
notify pgrst, 'reload schema';
