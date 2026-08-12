-- Prime IV Loyalty Portal - initial Supabase schema
-- Run once in a new Supabase project: Dashboard > SQL Editor > New query > Run.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.staff_role as enum ('staff', 'manager', 'admin');
create type public.appointment_status as enum ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.reward_status as enum ('issued', 'redeemed', 'expired', 'voided');

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  timezone text not null default 'America/New_York',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  gender text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  preferred_location_id uuid references public.locations(id) on delete set null,
  member_code text not null unique default ('PIV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  qr_token uuid not null unique default gen_random_uuid(),
  qr_rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_gender_length check (gender is null or char_length(gender) <= 60)
);

comment on column public.profiles.qr_token is
  'Opaque token encoded into the QR. Generate the QR image in the app; do not encode personal data.';

create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  role public.staff_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, location_id)
);

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_visits integer not null default 5 check (total_visits > 0),
  repeat_after_completion boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint loyalty_program_dates check (ends_at is null or ends_at > starts_at)
);

create table public.services (
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

create table public.reward_definitions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  visit_number integer not null check (visit_number > 0),
  name text not null,
  description text,
  terms text,
  valid_days integer check (valid_days is null or valid_days > 0),
  is_free_product boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (program_id, visit_number)
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete restrict,
  cycle integer not null default 1 check (cycle > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, program_id, cycle)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  service_id uuid references public.services(id) on delete restrict,
  service_name text not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  status public.appointment_status not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_order check (scheduled_end is null or scheduled_end > scheduled_start)
);

create table public.visit_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.loyalty_accounts(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null unique,
  occurred_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id) on delete restrict,
  reversal_reason text,
  created_at timestamptz not null default now(),
  constraint visit_reversal_complete check (
    (reversed_at is null and reversed_by is null and reversal_reason is null)
    or (reversed_at is not null and reversed_by is not null and reversal_reason is not null)
  )
);

create table public.reward_awards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.loyalty_accounts(id) on delete restrict,
  reward_definition_id uuid not null references public.reward_definitions(id) on delete restrict,
  source_visit_id uuid not null unique references public.visit_events(id) on delete restrict,
  status public.reward_status not null default 'issued',
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete restrict,
  redeemed_location_id uuid references public.locations(id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete restrict,
  void_reason text,
  constraint reward_redemption_complete check (
    (status <> 'redeemed') or (redeemed_at is not null and redeemed_by is not null)
  ),
  constraint reward_void_complete check (
    (status <> 'voided') or (voided_at is not null and voided_by is not null and void_reason is not null)
  )
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_preferred_location_idx on public.profiles(preferred_location_id);
create index services_active_order_idx on public.services(active, is_bookable, display_order);
create index staff_user_active_idx on public.staff_memberships(user_id, active);
create index loyalty_accounts_user_active_idx on public.loyalty_accounts(user_id, active);
create index appointments_user_start_idx on public.appointments(user_id, scheduled_start);
create index appointments_location_start_idx on public.appointments(location_id, scheduled_start);
create index visits_account_time_idx on public.visit_events(account_id, occurred_at desc);
create index rewards_account_status_idx on public.reward_awards(account_id, status, expires_at);
create index audit_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_memberships sm
    where sm.user_id = (select auth.uid()) and sm.active
  );
$$;

create or replace function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_memberships sm
    where sm.user_id = (select auth.uid())
      and sm.active and sm.role in ('manager', 'admin')
  );
$$;

revoke all on function private.is_staff() from public;
revoke all on function private.is_manager() from public;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_manager() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();

insert into public.services (name, description, category, is_bookable, display_order)
values
  ('Hydration IV', 'IV hydration experience selected with the wellness team.', 'iv_therapy', true, 10),
  ('Wellness injection', 'Eligible wellness injection selected with the wellness team.', 'injection', true, 20),
  ('Consultation', 'Consult with the wellness team before choosing a service.', 'consultation', true, 30),
  ('Not sure yet', 'Choose the service with help from the wellness team.', 'consultation', true, 40),
  ('$25 credit', 'A $25 credit toward an eligible Prime IV experience.', 'reward', false, 100),
  ('Complimentary IV additive', 'One eligible IV additive at no charge.', 'reward', false, 110),
  ('Complimentary NAD shot', 'One eligible NAD shot at no charge.', 'reward', false, 120),
  ('Complimentary IV drip', 'One eligible IV drip at no charge.', 'reward', false, 130);

-- Seed the initial program and its visit-specific free products.
with new_program as (
  insert into public.loyalty_programs (name, total_visits, repeat_after_completion)
  values ('Prime IV Loyalty Rewards', 5, true)
  returning id
)
insert into public.reward_definitions
  (program_id, visit_number, name, description, is_free_product)
select id, visit_number, name, description, is_free_product
from new_program
cross join (values
  (1, 'Welcome visit', 'Your loyalty journey begins.', false),
  (2, '$25 credit', 'A $25 credit toward an eligible Prime IV experience.', false),
  (3, 'Complimentary IV additive', 'One eligible IV additive at no charge.', true),
  (4, 'Complimentary NAD shot', 'One eligible NAD shot at no charge.', true),
  (5, 'Complimentary IV drip', 'One eligible IV drip at no charge.', true)
) as rewards(visit_number, name, description, is_free_product);

update public.reward_definitions rd
set service_id = s.id
from public.services s
where lower(rd.name) = lower(s.name);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_program_id uuid;
begin
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.phone, '')
  );

  select lp.id into active_program_id
  from public.loyalty_programs lp
  where lp.active and lp.starts_at <= now()
    and (lp.ends_at is null or lp.ends_at > now())
  order by lp.starts_at desc limit 1;

  if active_program_id is not null then
    insert into public.loyalty_accounts (user_id, program_id)
    values (new.id, active_program_id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Return only the data staff needs after scanning a QR token.
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
  if not private.is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  return query
  select p.id, p.first_name, p.last_name, p.member_code, la.id,
    count(ve.id) filter (where ve.reversed_at is null)
  from public.profiles p
  join public.loyalty_accounts la on la.user_id = p.id and la.active
  left join public.visit_events ve on ve.account_id = la.id
  where p.qr_token = scanned_token
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
  new_visit public.visit_events;
  visit_count integer;
  reward public.reward_definitions;
  award_id uuid;
begin
  if actor is null or not private.is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  select * into new_visit from public.visit_events where idempotency_key = request_id;
  if found then
    return jsonb_build_object('visit_id', new_visit.id, 'duplicate', true);
  end if;

  insert into public.visit_events
    (account_id, appointment_id, location_id, recorded_by, idempotency_key)
  values
    (target_account_id, target_appointment_id, target_location_id, actor, request_id)
  returning * into new_visit;

  select count(*)::integer into visit_count
  from public.visit_events ve
  where ve.account_id = target_account_id and ve.reversed_at is null;

  select rd.* into reward
  from public.loyalty_accounts la
  join public.reward_definitions rd on rd.program_id = la.program_id
  where la.id = target_account_id and rd.visit_number = visit_count and rd.active;

  if reward.id is not null then
    insert into public.reward_awards
      (account_id, reward_definition_id, source_visit_id, expires_at)
    values
      (target_account_id, reward.id, new_visit.id,
       case when reward.valid_days is null then null else now() + make_interval(days => reward.valid_days) end)
    returning id into award_id;
  end if;

  if target_appointment_id is not null then
    update public.appointments set status = 'completed'
    where id = target_appointment_id and user_id = (
      select la.user_id from public.loyalty_accounts la where la.id = target_account_id
    );
  end if;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'visit.recorded', 'visit_event', new_visit.id,
    jsonb_build_object('visit_number', visit_count, 'reward_award_id', award_id));

  return jsonb_build_object(
    'visit_id', new_visit.id,
    'visit_number', visit_count,
    'reward_award_id', award_id,
    'duplicate', false
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
  redeemed public.reward_awards;
begin
  if actor is null or not private.is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  update public.reward_awards
  set status = 'redeemed', redeemed_at = now(), redeemed_by = actor,
      redeemed_location_id = target_location_id
  where id = target_award_id and status = 'issued'
    and (expires_at is null or expires_at > now())
  returning * into redeemed;

  if redeemed.id is null then
    raise exception 'Reward unavailable, expired, or already redeemed';
  end if;

  insert into public.audit_events (actor_id, action, entity_type, entity_id)
  values (actor, 'reward.redeemed', 'reward_award', redeemed.id);
  return redeemed;
end;
$$;

revoke all on function public.lookup_member_by_qr(uuid) from public, anon;
revoke all on function public.record_visit(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.redeem_reward(uuid, uuid) from public, anon;
grant execute on function public.lookup_member_by_qr(uuid) to authenticated;
grant execute on function public.record_visit(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.redeem_reward(uuid, uuid) to authenticated;

alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.services enable row level security;
alter table public.reward_definitions enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.appointments enable row level security;
alter table public.visit_events enable row level security;
alter table public.reward_awards enable row level security;
alter table public.audit_events enable row level security;

create policy locations_read on public.locations for select to authenticated
using (active or (select private.is_staff()));
create policy programs_read on public.loyalty_programs for select to authenticated using (active);
create policy services_read on public.services for select to authenticated
using (active or (select private.is_staff()));
create policy rewards_catalog_read on public.reward_definitions for select to authenticated using (active);

create policy profiles_read_own_or_staff on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy staff_memberships_read_own_or_manager on public.staff_memberships for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_manager()));

create policy accounts_read_own_or_staff on public.loyalty_accounts for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_staff()));

create policy appointments_read_own_or_staff on public.appointments for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy appointments_insert_own on public.appointments for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy appointments_update_own_or_staff on public.appointments for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_staff()))
with check ((select auth.uid()) = user_id or (select private.is_staff()));

create policy visits_read_own_or_staff on public.visit_events for select to authenticated
using (
  exists (select 1 from public.loyalty_accounts la
          where la.id = account_id and la.user_id = (select auth.uid()))
  or (select private.is_staff())
);

create policy awards_read_own_or_staff on public.reward_awards for select to authenticated
using (
  exists (select 1 from public.loyalty_accounts la
          where la.id = account_id and la.user_id = (select auth.uid()))
  or (select private.is_staff())
);

create policy audit_read_manager on public.audit_events for select to authenticated
using ((select private.is_manager()));

grant usage on schema public to authenticated;
grant select on public.locations, public.loyalty_programs, public.reward_definitions to authenticated;
grant select on public.services to authenticated;
grant select on public.profiles, public.staff_memberships, public.loyalty_accounts,
  public.appointments, public.visit_events, public.reward_awards, public.audit_events to authenticated;
grant insert on public.appointments to authenticated;
grant update (service_name, location_id, scheduled_start, scheduled_end, status, notes)
  on public.appointments to authenticated;
grant update (service_id) on public.appointments to authenticated;
grant update (first_name, last_name, phone, gender, address_line_1, address_line_2,
  city, state, postal_code, preferred_location_id) on public.profiles to authenticated;

commit;

-- AFTER creating a staff user in Authentication, promote them with this statement.
-- Replace the email and location as needed, then run separately:
-- insert into public.staff_memberships (user_id, role)
-- select id, 'admin'::public.staff_role from auth.users where email = 'owner@example.com';

-- The app should encode this value in the member QR (not the user's personal details):
-- select qr_token from public.profiles where id = auth.uid();

-- The next scheduled visit for the signed-in guest:
-- select * from public.appointments
-- where user_id = auth.uid() and status in ('requested', 'confirmed')
--   and scheduled_start >= now()
-- order by scheduled_start limit 1;
