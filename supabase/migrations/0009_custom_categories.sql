-- 0009_custom_categories.sql — household-scoped custom categories.
-- Global catalog rows keep household_id NULL and a `key`; custom rows carry
-- the household and a free-text `label` with key NULL (unique ignores NULLs).
--
-- IDEMPOTENT: every statement is safe to re-run. A previous partial run dies
-- on plain ADD COLUMN, so all additions below use IF NOT EXISTS guards.

alter table public.categories add column if not exists household_id uuid;

alter table public.categories add column if not exists label text;

-- Foreign key under a fixed name so re-runs (and PG's default naming from a
-- partial first run) converge instead of duplicating.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_household_id_fkey'
  ) then
    alter table public.categories
      add constraint categories_household_id_fkey
      foreign key (household_id) references public.households(id) on delete cascade;
  end if;
end
$$;

-- No-op when already nullable.
alter table public.categories alter column key drop not null;

create index if not exists categories_household_idx on public.categories (household_id);

-- Replace the global-read policy with scoped access. Migrations run as
-- postgres and bypass RLS, so seeds stay untouched.
drop policy if exists categories_read on public.categories;

create policy categories_select on public.categories
  for select to authenticated
  using (
    household_id is null
    or household_id = (select household_id from public.users where id = auth.uid())
  );

create policy categories_insert on public.categories
  for insert to authenticated
  with check (
    household_id = (select household_id from public.users where id = auth.uid())
    and key is null
  );

create policy categories_update on public.categories
  for update to authenticated
  using (household_id = (select household_id from public.users where id = auth.uid()))
  with check (
    household_id = (select household_id from public.users where id = auth.uid())
    and key is null
  );

create policy categories_delete on public.categories
  for delete to authenticated
  using (household_id = (select household_id from public.users where id = auth.uid()));
