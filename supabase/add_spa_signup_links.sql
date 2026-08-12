-- Unique customer signup link for every spa.
-- Run once after the multi-spa migration.
begin;

alter table public.spas
  add column if not exists signup_token uuid default gen_random_uuid();

update public.spas set signup_token = gen_random_uuid() where signup_token is null;

alter table public.spas alter column signup_token set not null;
create unique index if not exists spas_signup_token_unique on public.spas(signup_token);

comment on column public.spas.signup_token is
  'Opaque token used by the public spa-specific customer registration URL.';

commit;
