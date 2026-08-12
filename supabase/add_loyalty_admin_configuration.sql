-- Loyalty defaults for every new spa + tenant-safe admin configuration.
-- Run once after add_multispa_tenancy.sql.

begin;

create or replace function public.seed_new_spa_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_id uuid;
  credit_id uuid;
  additive_id uuid;
  nad_id uuid;
  drip_id uuid;
begin
  insert into public.services (spa_id, name, description, category, is_bookable, display_order)
  values
    (new.id, 'Hydration IV', 'IV hydration experience selected with the wellness team.', 'iv_therapy', true, 10),
    (new.id, 'Wellness injection', 'Eligible wellness injection selected with the wellness team.', 'injection', true, 20),
    (new.id, 'Consultation', 'Consult with the wellness team before choosing a service.', 'consultation', true, 30),
    (new.id, 'Not sure yet', 'Choose the service with help from the wellness team.', 'consultation', true, 40),
    (new.id, '$25 credit', 'A $25 credit toward an eligible Prime IV experience.', 'reward', false, 100),
    (new.id, 'Complimentary IV additive', 'One eligible IV additive at no charge.', 'reward', false, 110),
    (new.id, 'Complimentary NAD shot', 'One eligible NAD shot at no charge.', 'reward', false, 120),
    (new.id, 'Complimentary IV drip', 'One eligible IV drip at no charge.', 'reward', false, 130)
  on conflict (spa_id, name) do nothing;

  select id into credit_id from public.services where spa_id = new.id and name = '$25 credit';
  select id into additive_id from public.services where spa_id = new.id and name = 'Complimentary IV additive';
  select id into nad_id from public.services where spa_id = new.id and name = 'Complimentary NAD shot';
  select id into drip_id from public.services where spa_id = new.id and name = 'Complimentary IV drip';

  insert into public.loyalty_programs (spa_id, name, total_visits, repeat_after_completion, active)
  values (new.id, 'Five Visit Loyalty Rewards', 5, true, true)
  returning id into program_id;

  insert into public.reward_definitions
    (spa_id, program_id, service_id, visit_number, name, description, is_free_product, active)
  values
    (new.id, program_id, null, 1, 'Welcome visit', 'You’re on your way.', false, true),
    (new.id, program_id, credit_id, 2, '$25 credit', 'A $25 credit toward an eligible Prime IV experience.', false, true),
    (new.id, program_id, additive_id, 3, 'Complimentary IV additive', 'One eligible IV additive at no charge.', true, true),
    (new.id, program_id, nad_id, 4, 'Complimentary NAD shot', 'One eligible NAD shot at no charge.', true, true),
    (new.id, program_id, drip_id, 5, 'Complimentary IV drip', 'One eligible IV drip at no charge.', true, true);

  return new;
end;
$$;

drop trigger if exists seed_new_spa_defaults_trigger on public.spas;
create trigger seed_new_spa_defaults_trigger
after insert on public.spas
for each row execute function public.seed_new_spa_defaults();

-- Manager/admin write policies remain scoped to their own spa.
drop policy if exists programs_manage_spa on public.loyalty_programs;
create policy programs_manage_spa on public.loyalty_programs for all to authenticated
using ((select private.manages_spa(spa_id)))
with check ((select private.manages_spa(spa_id)));

drop policy if exists reward_defs_manage_spa on public.reward_definitions;
create policy reward_defs_manage_spa on public.reward_definitions for all to authenticated
using ((select private.manages_spa(spa_id)))
with check ((select private.manages_spa(spa_id)));

drop policy if exists services_manage_spa on public.services;
create policy services_manage_spa on public.services for all to authenticated
using ((select private.manages_spa(spa_id)))
with check ((select private.manages_spa(spa_id)));

grant insert, update, delete on public.loyalty_programs to authenticated;
grant insert, update, delete on public.reward_definitions to authenticated;
grant insert, update, delete on public.services to authenticated;

commit;
