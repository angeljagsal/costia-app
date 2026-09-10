-- 0001_schema.sql — core tables + indexes.
-- Apply in order: 0001 .. 0006 (paste each file into Supabase Dashboard → SQL editor).
--
-- Money rule: reports aggregate transactions.base_amount, which is frozen at
-- creation time. Nothing ever recomputes it on read.
-- Scope rule: every household-owned row carries household_id directly so RLS
-- policies never need a join (see 0004_rls.sql).

create extension if not exists "pgcrypto";

-- Households sit above everything: a second user joins later with no migration.
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  base_currency text not null default 'MXN' check (base_currency in ('MXN', 'USD')),
  household_id uuid references public.households(id),
  locale text not null default 'en' check (locale in ('en', 'es-MX')),
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank', 'cash', 'credit', 'digital_wallet', 'investment')),
  created_at timestamptz not null default now()
);

-- Global catalog. `key` resolves to a localized name client-side
-- (dictionary entry `categories.<key>`); custom user categories land in Phase 4.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null check (kind in ('expense', 'income')),
  sort int not null default 0
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('MXN', 'USD')),
  base_amount numeric not null check (base_amount > 0),
  txn_date date not null,
  kind text not null check (kind in ('expense', 'income')),
  note text,
  recurring_rule_id uuid,
  created_at timestamptz not null default now()
);

create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric not null check (amount > 0)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  unique (household_id, name)
);

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  limit_amount numeric not null check (limit_amount > 0),
  period text not null check (period in ('weekly', 'monthly', 'yearly')),
  unique (household_id, category_id, period)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('MXN', 'USD')),
  cadence text not null check (cadence in ('weekly', 'monthly', 'yearly')),
  next_due date not null,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Past generated transactions survive rule deletion (set null), so history is kept.
alter table public.transactions
  add constraint transactions_recurring_rule_fk
  foreign key (recurring_rule_id) references public.recurring_rules(id) on delete set null;

create table public.exchange_rates (
  id serial primary key,
  base_currency text not null,
  target_currency text not null,
  rate numeric not null check (rate > 0),
  rate_date date not null,
  fetched_at timestamptz not null default now(),
  unique (base_currency, target_currency, rate_date)
);

-- Hot paths: monthly lists, budget sums, due-rule scan, FX lookup.
create index transactions_household_date_idx on public.transactions (household_id, txn_date desc);
create index transactions_account_idx on public.transactions (account_id);
create index splits_transaction_idx on public.transaction_splits (transaction_id);
create index txn_tags_transaction_idx on public.transaction_tags (transaction_id);
create index txn_tags_tag_idx on public.transaction_tags (tag_id);
create index budgets_household_idx on public.budgets (household_id);
create index recurring_due_idx on public.recurring_rules (household_id, next_due) where is_active;
create index rates_lookup_idx on public.exchange_rates (base_currency, target_currency, rate_date desc);
