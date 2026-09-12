-- 0011_transfers.sql — native account-to-account transfers.
-- One row per transfer: kind='transfer', account_id = source, to_account_id = dest,
-- category_id NULL (no category, no splits, no tags). Excluded from income/expense
-- reports; affects balances only (debit source, credit dest).
-- IDEMPOTENT: safe to re-run.

alter table public.transactions add column if not exists to_account_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_to_account_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_to_account_id_fkey
      foreign key (to_account_id) references public.accounts(id) on delete restrict;
  end if;
end
$$;

-- Transfers carry no category.
alter table public.transactions alter column category_id drop not null;

-- Replace the kind check (name varies by how 0001 was applied).
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.transactions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%kind%';
  if cname is not null then
    execute format('alter table public.transactions drop constraint %I', cname);
  end if;
end
$$;

alter table public.transactions
  add constraint transactions_kind_check
  check (kind in ('expense', 'income', 'transfer'));

-- Transfer integrity: source != dest, no category/splits semantics enforced
-- at the app layer; the DB enforces the structural core.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_transfer_check'
  ) then
    alter table public.transactions
      add constraint transactions_transfer_check
      check (
        (kind <> 'transfer' and to_account_id is null)
        or
        (kind = 'transfer' and to_account_id is not null
          and to_account_id <> account_id and category_id is null
          and recurring_rule_id is null)
      );
  end if;
end
$$;

create index if not exists transactions_to_account_idx
  on public.transactions (to_account_id);
