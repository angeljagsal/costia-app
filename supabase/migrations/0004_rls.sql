-- 0004_rls.sql — household isolation. Every policy compares household_id
-- against the caller's own users row; no joins needed.
-- The signup trigger (0003) is SECURITY DEFINER so it bypasses these policies.

alter table public.households enable row level security;
alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.categories enable row level security;
alter table public.exchange_rates enable row level security;

-- Own user row only.
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Own household row only.
drop policy if exists households_member on public.households;
create policy households_member on public.households
  for all to authenticated
  using (id = (select household_id from public.users where id = auth.uid()))
  with check (id = (select household_id from public.users where id = auth.uid()));

-- Household-scoped tables share one policy shape.
drop policy if exists accounts_household on public.accounts;
create policy accounts_household on public.accounts
  for all to authenticated
  using (household_id = (select household_id from public.users where id = auth.uid()))
  with check (household_id = (select household_id from public.users where id = auth.uid()));

drop policy if exists transactions_household on public.transactions;
create policy transactions_household on public.transactions
  for all to authenticated
  using (household_id = (select household_id from public.users where id = auth.uid()))
  with check (household_id = (select household_id from public.users where id = auth.uid()));

drop policy if exists budgets_household on public.budgets;
create policy budgets_household on public.budgets
  for all to authenticated
  using (household_id = (select household_id from public.users where id = auth.uid()))
  with check (household_id = (select household_id from public.users where id = auth.uid()));

drop policy if exists recurring_household on public.recurring_rules;
create policy recurring_household on public.recurring_rules
  for all to authenticated
  using (household_id = (select household_id from public.users where id = auth.uid()))
  with check (household_id = (select household_id from public.users where id = auth.uid()));

drop policy if exists tags_household on public.tags;
create policy tags_household on public.tags
  for all to authenticated
  using (household_id = (select household_id from public.users where id = auth.uid()))
  with check (household_id = (select household_id from public.users where id = auth.uid()));

-- Splits and tag links inherit scope through their parent transaction.
drop policy if exists splits_via_transaction on public.transaction_splits;
create policy splits_via_transaction on public.transaction_splits
  for all to authenticated
  using (exists (
    select 1 from public.transactions t
    where t.id = transaction_id
      and t.household_id = (select household_id from public.users where id = auth.uid())
  ))
  with check (exists (
    select 1 from public.transactions t
    where t.id = transaction_id
      and t.household_id = (select household_id from public.users where id = auth.uid())
  ));

drop policy if exists txn_tags_via_transaction on public.transaction_tags;
create policy txn_tags_via_transaction on public.transaction_tags
  for all to authenticated
  using (exists (
    select 1 from public.transactions t
    where t.id = transaction_id
      and t.household_id = (select household_id from public.users where id = auth.uid())
  ))
  with check (exists (
    select 1 from public.transactions t
    where t.id = transaction_id
      and t.household_id = (select household_id from public.users where id = auth.uid())
  ));

-- Global read-only catalogs for any signed-in user (writes happen via migrations).
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select to authenticated using (true);

drop policy if exists rates_read on public.exchange_rates;
create policy rates_read on public.exchange_rates
  for select to authenticated using (true);
