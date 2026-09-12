-- backfill-household.sql — one-off repair, NOT a migration.
-- Use when: app shows green "Synced" but every screen waits for first sync,
-- which means public.users has no row for the signed-in account
-- (e.g. signed up before 0003_auth_trigger.sql was applied).
--
-- 1. Replace PASTE_EMAIL_HERE with the sign-in email (keep the quotes).
-- 2. Run the whole file in Supabase Dashboard → SQL editor.
-- 3. Safe to re-run: existing rows are detected and left alone.
-- 4. Sign out and back in on the device afterwards.

do $$
declare
  target_email text := 'PASTE_EMAIL_HERE';
  uid uuid;
  hh uuid;
begin
  select id into uid from auth.users where email = target_email;

  if uid is null then
    raise exception 'no auth user found for % — check the email spelling', target_email;
  end if;

  if exists (select 1 from public.users where id = uid) then
    raise notice 'users row already exists for % — nothing to do', target_email;
    return;
  end if;

  insert into public.households (name)
  values ('My household')
  returning id into hh;

  insert into public.users (id, email, household_id)
  values (uid, target_email, hh);

  raise notice 'created household % for %', hh, target_email;
end
$$;
