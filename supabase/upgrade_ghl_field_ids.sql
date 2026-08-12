-- Add the GHL custom-field mappings to an existing ghl_connections table.
-- Run once in Supabase SQL Editor.
begin;

alter table public.ghl_connections
  add column if not exists spa_visits_field_id text,
  add column if not exists last_spa_visits_field_id text;

comment on column public.ghl_connections.spa_visits_field_id is
  'GoHighLevel contact custom-field ID for Spa_Visits.';
comment on column public.ghl_connections.last_spa_visits_field_id is
  'GoHighLevel contact custom-field ID for Last_Spa_Visits.';

commit;

-- Tell Supabase PostgREST to immediately recognize the new columns.
notify pgrst, 'reload schema';

-- Verification: this should return both rows.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ghl_connections'
  and column_name in ('spa_visits_field_id', 'last_spa_visits_field_id')
order by column_name;
