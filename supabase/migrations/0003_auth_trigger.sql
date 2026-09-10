-- 0003_auth_trigger.sql — first magic-link sign-in auto-creates
-- household + public.users row, so onboarding needs zero manual steps.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  hh_id uuid;
begin
  insert into public.households (name) values ('My household') returning id into hh_id;
  insert into public.users (id, email, household_id)
  values (new.id, new.email, hh_id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
