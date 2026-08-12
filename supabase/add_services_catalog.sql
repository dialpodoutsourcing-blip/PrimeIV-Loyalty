-- Follow-up migration: database-managed products/services catalog.
-- Safe to run after prime_iv_schema.sql has already succeeded.

begin;

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

update public.appointments a
set service_id = s.id
from public.services s
where a.service_id is null and lower(a.service_name) = lower(s.name);

alter table public.reward_definitions
  add column if not exists service_id uuid references public.services(id) on delete set null;

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

drop policy if exists services_read on public.services;
create policy services_read on public.services for select to authenticated
using (active or (select private.is_staff()));

grant select on public.services to authenticated;
grant update (service_id) on public.appointments to authenticated;

commit;

-- Customer scheduling catalog:
-- select id, name, description, category, duration_minutes, price_cents
-- from public.services
-- where active and is_bookable
-- order by display_order, name;
