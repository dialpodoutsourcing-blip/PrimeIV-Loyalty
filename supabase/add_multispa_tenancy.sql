-- COMPLETE EXISTING-DATABASE UPGRADE: services catalog + multi-spa tenancy.
-- Run this once after the original Prime IV tables already exist.
-- Do NOT rerun prime_iv_schema.sql or add_services_catalog.sql first.
-- Existing data is preserved and assigned to one default spa.

begin;

-- 1. Install the products/services catalog if it has not been installed yet.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  category text not null default 'service',
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  price_cents integer check (price_cents is null or price_cents >= 0),
  is_bookable boolean not null default true,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.services (name, description, category, is_bookable, display_order)
values
  ('Hydration IV', 'IV hydration experience selected with the wellness team.', 'iv_therapy', true, 10),
  ('Wellness injection', 'Eligible wellness injection selected with the wellness team.', 'injection', true, 20),
  ('Consultation', 'Consult with the wellness team before choosing a service.', 'consultation', true, 30),
  ('Not sure yet', 'Choose the service with help from the wellness team.', 'consultation', true, 40),
  ('$25 credit', 'A $25 credit toward an eligible Prime IV experience.', 'reward', false, 100),
  ('Complimentary IV additive', 'One eligible IV additive at no charge.', 'reward', false, 110),
  ('Complimentary NAD shot', 'One eligible NAD shot at no charge.', 'reward', false, 120),
  ('Complimentary IV drip', 'One eligible IV drip at no charge.', 'reward', false, 130)
on conflict (name) do update set
  description = excluded.description,
  category = excluded.category,
  is_bookable = excluded.is_bookable,
  display_order = excluded.display_order,
  active = true;

alter table public.appointments
  add column if not exists service_id uuid references public.services(id) on delete restrict;
alter table public.reward_definitions
  add column if not exists service_id uuid references public.services(id) on delete set null;

update public.appointments a
set service_id = s.id
from public.services s
where a.service_id is null and lower(a.service_name) = lower(s.name);

update public.reward_definitions rd
set service_id = s.id
from public.services s
where rd.service_id is null and lower(rd.name) = lower(s.name);

create index if not exists services_active_order_idx
  on public.services(active, is_bookable, display_order);
create index if not exists appointments_service_idx on public.appointments(service_id);
create index if not exists reward_definitions_service_idx on public.reward_definitions(service_id);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();

alter table public.services enable row level security;

-- 2. Create the primary spa/tenant record.
create table if not exists public.spas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  support_email text,
  support_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.spas (name, slug)
values ('Prime IV Spa 1', 'spa-1')
on conflict (slug) do nothing;

-- Add the tenant key to every spa-owned table.
alter table public.locations add column if not exists spa_id uuid references public.spas(id) on delete restrict;
alter table public.profiles add column if not exists spa_id uuid references public.spas(id) on delete restrict;
alter table public.staff_memberships add column if not exists spa_id uuid references public.spas(id) on delete cascade;
alter table public.loyalty_programs add column if not exists spa_id uuid references public.spas(id) on delete cascade;
alter table public.services add column if not exists spa_id uuid references public.spas(id) on delete cascade;
alter table public.reward_definitions add column if not exists spa_id uuid references public.spas(id) on delete cascade;
alter table public.loyalty_accounts add column if not exists spa_id uuid references public.spas(id) on delete cascade;
alter table public.appointments add column if not exists spa_id uuid references public.spas(id) on delete cascade;
alter table public.visit_events add column if not exists spa_id uuid references public.spas(id) on delete restrict;
alter table public.reward_awards add column if not exists spa_id uuid references public.spas(id) on delete restrict;
alter table public.audit_events add column if not exists spa_id uuid references public.spas(id) on delete restrict;

-- Backfill existing records. Relationships are preferred over the fallback spa.
update public.locations
set spa_id = (select id from public.spas where slug = 'spa-1')
where spa_id is null;

update public.profiles p
set spa_id = coalesce(
  (select l.spa_id from public.locations l where l.id = p.preferred_location_id),
  (select id from public.spas where slug = 'spa-1')
)
where p.spa_id is null;

update public.staff_memberships sm
set spa_id = coalesce(
  (select l.spa_id from public.locations l where l.id = sm.location_id),
  (select id from public.spas where slug = 'spa-1')
)
where sm.spa_id is null;

update public.loyalty_programs
set spa_id = (select id from public.spas where slug = 'spa-1')
where spa_id is null;

update public.services
set spa_id = (select id from public.spas where slug = 'spa-1')
where spa_id is null;

update public.reward_definitions rd
set spa_id = lp.spa_id
from public.loyalty_programs lp
where rd.program_id = lp.id and rd.spa_id is null;

update public.loyalty_accounts la
set spa_id = p.spa_id
from public.profiles p
where la.user_id = p.id and la.spa_id is null;

update public.appointments a
set spa_id = p.spa_id
from public.profiles p
where a.user_id = p.id and a.spa_id is null;

update public.visit_events ve
set spa_id = la.spa_id
from public.loyalty_accounts la
where ve.account_id = la.id and ve.spa_id is null;

update public.reward_awards ra
set spa_id = la.spa_id
from public.loyalty_accounts la
where ra.account_id = la.id and ra.spa_id is null;

update public.audit_events
set spa_id = (select id from public.spas where slug = 'spa-1')
where spa_id is null;

alter table public.locations alter column spa_id set not null;
alter table public.profiles alter column spa_id set not null;
alter table public.staff_memberships alter column spa_id set not null;
alter table public.loyalty_programs alter column spa_id set not null;
alter table public.services alter column spa_id set not null;
alter table public.reward_definitions alter column spa_id set not null;
alter table public.loyalty_accounts alter column spa_id set not null;
alter table public.appointments alter column spa_id set not null;
alter table public.visit_events alter column spa_id set not null;
alter table public.reward_awards alter column spa_id set not null;
alter table public.audit_events alter column spa_id set not null;

-- Composite uniqueness lets foreign keys enforce that related rows share a spa.
alter table public.locations add constraint locations_id_spa_unique unique (id, spa_id);
alter table public.profiles add constraint profiles_id_spa_unique unique (id, spa_id);
alter table public.loyalty_programs add constraint programs_id_spa_unique unique (id, spa_id);
alter table public.services add constraint services_id_spa_unique unique (id, spa_id);
alter table public.reward_definitions add constraint reward_definitions_id_spa_unique unique (id, spa_id);
alter table public.loyalty_accounts add constraint accounts_id_spa_unique unique (id, spa_id);
alter table public.appointments add constraint appointments_id_spa_unique unique (id, spa_id);
alter table public.visit_events add constraint visits_id_spa_unique unique (id, spa_id);

alter table public.profiles add constraint profiles_location_same_spa
  foreign key (preferred_location_id, spa_id) references public.locations(id, spa_id);
alter table public.staff_memberships add constraint staff_location_same_spa
  foreign key (location_id, spa_id) references public.locations(id, spa_id);
alter table public.reward_definitions add constraint rewards_program_same_spa
  foreign key (program_id, spa_id) references public.loyalty_programs(id, spa_id);
alter table public.reward_definitions add constraint rewards_service_same_spa
  foreign key (service_id, spa_id) references public.services(id, spa_id);
alter table public.loyalty_accounts add constraint accounts_profile_same_spa
  foreign key (user_id, spa_id) references public.profiles(id, spa_id);
alter table public.loyalty_accounts add constraint accounts_program_same_spa
  foreign key (program_id, spa_id) references public.loyalty_programs(id, spa_id);
alter table public.appointments add constraint appointments_profile_same_spa
  foreign key (user_id, spa_id) references public.profiles(id, spa_id);
alter table public.appointments add constraint appointments_location_same_spa
  foreign key (location_id, spa_id) references public.locations(id, spa_id);
alter table public.appointments add constraint appointments_service_same_spa
  foreign key (service_id, spa_id) references public.services(id, spa_id);
alter table public.visit_events add constraint visits_account_same_spa
  foreign key (account_id, spa_id) references public.loyalty_accounts(id, spa_id);
alter table public.visit_events add constraint visits_appointment_same_spa
  foreign key (appointment_id, spa_id) references public.appointments(id, spa_id);
alter table public.visit_events add constraint visits_location_same_spa
  foreign key (location_id, spa_id) references public.locations(id, spa_id);
alter table public.reward_awards add constraint awards_account_same_spa
  foreign key (account_id, spa_id) references public.loyalty_accounts(id, spa_id);
alter table public.reward_awards add constraint awards_definition_same_spa
  foreign key (reward_definition_id, spa_id) references public.reward_definitions(id, spa_id);
alter table public.reward_awards add constraint awards_visit_same_spa
  foreign key (source_visit_id, spa_id) references public.visit_events(id, spa_id);
alter table public.reward_awards add constraint awards_location_same_spa
  foreign key (redeemed_location_id, spa_id) references public.locations(id, spa_id);

-- Names and program membership are unique inside a spa, not globally.
alter table public.services drop constraint if exists services_name_key;
alter table public.services add constraint services_spa_name_unique unique (spa_id, name);
alter table public.staff_memberships drop constraint if exists staff_memberships_user_id_location_id_key;
alter table public.staff_memberships add constraint staff_spa_user_unique unique (spa_id, user_id);

create index if not exists locations_spa_idx on public.locations(spa_id);
create index if not exists profiles_spa_idx on public.profiles(spa_id);
create index if not exists staff_spa_idx on public.staff_memberships(spa_id, user_id, active);
create index if not exists programs_spa_idx on public.loyalty_programs(spa_id, active);
create index if not exists services_spa_idx on public.services(spa_id, active, is_bookable, display_order);
create index if not exists rewards_def_spa_idx on public.reward_definitions(spa_id, active);
create index if not exists accounts_spa_idx on public.loyalty_accounts(spa_id, user_id, active);
create index if not exists appointments_spa_idx on public.appointments(spa_id, scheduled_start);
create index if not exists visits_spa_idx on public.visit_events(spa_id, occurred_at desc);
create index if not exists awards_spa_idx on public.reward_awards(spa_id, status);
create index if not exists audits_spa_idx on public.audit_events(spa_id, created_at desc);

create trigger spas_set_updated_at before update on public.spas
for each row execute function public.set_updated_at();

create or replace function private.has_spa_access(target_spa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_memberships sm
    where sm.user_id = (select auth.uid())
      and sm.spa_id = target_spa_id and sm.active
  );
$$;

create or replace function private.manages_spa(target_spa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_memberships sm
    where sm.user_id = (select auth.uid())
      and sm.spa_id = target_spa_id and sm.active
      and sm.role in ('manager', 'admin')
  );
$$;

revoke all on function private.has_spa_access(uuid) from public;
revoke all on function private.manages_spa(uuid) from public;
grant execute on function private.has_spa_access(uuid) to authenticated;
grant execute on function private.manages_spa(uuid) to authenticated;

-- New signups must carry a valid spa_id in user metadata.
-- The application supplies this from the spa-specific signup URL/configuration.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_spa_id uuid;
  active_program_id uuid;
begin
  begin
    selected_spa_id := nullif(new.raw_user_meta_data ->> 'spa_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid spa_id supplied during signup';
  end;

  if selected_spa_id is null or not exists (
    select 1 from public.spas s where s.id = selected_spa_id and s.active
  ) then
    raise exception 'A valid active spa_id is required during signup';
  end if;

  insert into public.profiles (id, spa_id, first_name, last_name, phone)
  values (
    new.id, selected_spa_id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.phone, '')
  );

  select lp.id into active_program_id
  from public.loyalty_programs lp
  where lp.spa_id = selected_spa_id and lp.active and lp.starts_at <= now()
    and (lp.ends_at is null or lp.ends_at > now())
  order by lp.starts_at desc limit 1;

  if active_program_id is not null then
    insert into public.loyalty_accounts (spa_id, user_id, program_id)
    values (selected_spa_id, new.id, active_program_id);
  end if;
  return new;
end;
$$;

create or replace function public.lookup_member_by_qr(scanned_token uuid)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  member_code text,
  account_id uuid,
  completed_visits bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select p.id, p.first_name, p.last_name, p.member_code, la.id,
    count(ve.id) filter (where ve.reversed_at is null)
  from public.profiles p
  join public.loyalty_accounts la on la.user_id = p.id and la.spa_id = p.spa_id and la.active
  left join public.visit_events ve on ve.account_id = la.id and ve.spa_id = la.spa_id
  where p.qr_token = scanned_token
    and private.has_spa_access(p.spa_id)
  group by p.id, p.first_name, p.last_name, p.member_code, la.id;
end;
$$;

create or replace function public.record_visit(
  target_account_id uuid,
  request_id uuid,
  target_location_id uuid default null,
  target_appointment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_spa_id uuid;
  new_visit public.visit_events;
  visit_count integer;
  reward public.reward_definitions;
  award_id uuid;
begin
  select la.spa_id into target_spa_id
  from public.loyalty_accounts la where la.id = target_account_id and la.active;

  if actor is null or target_spa_id is null or not private.has_spa_access(target_spa_id) then
    raise exception 'Staff access to this spa is required' using errcode = '42501';
  end if;

  if target_location_id is not null and not exists (
    select 1 from public.locations l where l.id = target_location_id and l.spa_id = target_spa_id
  ) then raise exception 'Location does not belong to this spa'; end if;

  if target_appointment_id is not null and not exists (
    select 1 from public.appointments a
    where a.id = target_appointment_id and a.spa_id = target_spa_id
  ) then raise exception 'Appointment does not belong to this spa'; end if;

  select * into new_visit from public.visit_events
  where idempotency_key = request_id and spa_id = target_spa_id;
  if found then
    return jsonb_build_object('visit_id', new_visit.id, 'duplicate', true);
  end if;

  insert into public.visit_events
    (spa_id, account_id, appointment_id, location_id, recorded_by, idempotency_key)
  values
    (target_spa_id, target_account_id, target_appointment_id, target_location_id, actor, request_id)
  returning * into new_visit;

  select count(*)::integer into visit_count
  from public.visit_events ve
  where ve.account_id = target_account_id and ve.spa_id = target_spa_id and ve.reversed_at is null;

  select rd.* into reward
  from public.loyalty_accounts la
  join public.reward_definitions rd
    on rd.program_id = la.program_id and rd.spa_id = la.spa_id
  where la.id = target_account_id and la.spa_id = target_spa_id
    and rd.visit_number = visit_count and rd.active;

  if reward.id is not null then
    insert into public.reward_awards
      (spa_id, account_id, reward_definition_id, source_visit_id, expires_at)
    values
      (target_spa_id, target_account_id, reward.id, new_visit.id,
       case when reward.valid_days is null then null else now() + make_interval(days => reward.valid_days) end)
    returning id into award_id;
  end if;

  if target_appointment_id is not null then
    update public.appointments set status = 'completed'
    where id = target_appointment_id and spa_id = target_spa_id;
  end if;

  insert into public.audit_events (spa_id, actor_id, action, entity_type, entity_id, metadata)
  values (target_spa_id, actor, 'visit.recorded', 'visit_event', new_visit.id,
    jsonb_build_object('visit_number', visit_count, 'reward_award_id', award_id));

  return jsonb_build_object(
    'visit_id', new_visit.id, 'visit_number', visit_count,
    'reward_award_id', award_id, 'duplicate', false
  );
end;
$$;

create or replace function public.redeem_reward(
  target_award_id uuid,
  target_location_id uuid default null
)
returns public.reward_awards
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_spa_id uuid;
  redeemed public.reward_awards;
begin
  select ra.spa_id into target_spa_id
  from public.reward_awards ra where ra.id = target_award_id;

  if actor is null or target_spa_id is null or not private.has_spa_access(target_spa_id) then
    raise exception 'Staff access to this spa is required' using errcode = '42501';
  end if;

  if target_location_id is not null and not exists (
    select 1 from public.locations l where l.id = target_location_id and l.spa_id = target_spa_id
  ) then raise exception 'Location does not belong to this spa'; end if;

  update public.reward_awards
  set status = 'redeemed', redeemed_at = now(), redeemed_by = actor,
      redeemed_location_id = target_location_id
  where id = target_award_id and spa_id = target_spa_id and status = 'issued'
    and (expires_at is null or expires_at > now())
  returning * into redeemed;

  if redeemed.id is null then
    raise exception 'Reward unavailable, expired, or already redeemed';
  end if;

  insert into public.audit_events (spa_id, actor_id, action, entity_type, entity_id)
  values (target_spa_id, actor, 'reward.redeemed', 'reward_award', redeemed.id);
  return redeemed;
end;
$$;

-- Replace broad policies with tenant-aware policies.
drop policy if exists locations_read on public.locations;
drop policy if exists programs_read on public.loyalty_programs;
drop policy if exists services_read on public.services;
drop policy if exists rewards_catalog_read on public.reward_definitions;
drop policy if exists profiles_read_own_or_staff on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists staff_memberships_read_own_or_manager on public.staff_memberships;
drop policy if exists accounts_read_own_or_staff on public.loyalty_accounts;
drop policy if exists appointments_read_own_or_staff on public.appointments;
drop policy if exists appointments_insert_own on public.appointments;
drop policy if exists appointments_update_own_or_staff on public.appointments;
drop policy if exists visits_read_own_or_staff on public.visit_events;
drop policy if exists awards_read_own_or_staff on public.reward_awards;
drop policy if exists audit_read_manager on public.audit_events;

alter table public.spas enable row level security;

create policy spas_read_member on public.spas for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.spa_id = spas.id)
  or (select private.has_spa_access(id))
);
create policy locations_read_spa on public.locations for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.spa_id = locations.spa_id)
  or (select private.has_spa_access(spa_id))
);
create policy programs_read_spa on public.loyalty_programs for select to authenticated
using (
  (active and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.spa_id = loyalty_programs.spa_id))
  or (select private.has_spa_access(spa_id))
);
create policy services_read_spa on public.services for select to authenticated
using (
  (active and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.spa_id = services.spa_id))
  or (select private.has_spa_access(spa_id))
);
create policy reward_defs_read_spa on public.reward_definitions for select to authenticated
using (
  (active and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.spa_id = reward_definitions.spa_id))
  or (select private.has_spa_access(spa_id))
);
create policy profiles_read_spa on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.has_spa_access(spa_id)));
create policy profiles_update_own_spa on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy staff_read_spa on public.staff_memberships for select to authenticated
using ((select auth.uid()) = user_id or (select private.manages_spa(spa_id)));
create policy accounts_read_spa on public.loyalty_accounts for select to authenticated
using ((select auth.uid()) = user_id or (select private.has_spa_access(spa_id)));
create policy appointments_read_spa on public.appointments for select to authenticated
using ((select auth.uid()) = user_id or (select private.has_spa_access(spa_id)));
create policy appointments_insert_spa on public.appointments for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.spa_id = appointments.spa_id)
);
create policy appointments_update_spa on public.appointments for update to authenticated
using ((select auth.uid()) = user_id or (select private.has_spa_access(spa_id)))
with check ((select auth.uid()) = user_id or (select private.has_spa_access(spa_id)));
create policy visits_read_spa on public.visit_events for select to authenticated
using (
  exists (select 1 from public.loyalty_accounts la where la.id = account_id and la.user_id = (select auth.uid()))
  or (select private.has_spa_access(spa_id))
);
create policy awards_read_spa on public.reward_awards for select to authenticated
using (
  exists (select 1 from public.loyalty_accounts la where la.id = account_id and la.user_id = (select auth.uid()))
  or (select private.has_spa_access(spa_id))
);
create policy audit_read_spa_manager on public.audit_events for select to authenticated
using ((select private.manages_spa(spa_id)));

grant select on public.spas, public.services to authenticated;
grant update (service_id) on public.appointments to authenticated;

commit;

-- IMPORTANT signup example (spa UUID comes from your trusted spa configuration):
-- supabase.auth.signUp({
--   email,
--   password,
--   options: { data: { spa_id: 'SPA_UUID', first_name: 'Mia', last_name: 'Isabella' } }
-- })

-- Add a second spa:
-- insert into public.spas (name, slug, support_email)
-- values ('Prime IV Spa 2', 'spa-2', 'spa2@example.com') returning id;

-- Add a spa-specific service:
-- insert into public.services (spa_id, name, category, is_bookable, display_order)
-- values ('SPA_UUID', 'Hydration IV', 'iv_therapy', true, 10);
