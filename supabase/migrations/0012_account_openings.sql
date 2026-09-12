-- 0012_account_openings.sql — opening balances per account.
-- opening_base is a signed net-worth contribution in base-currency terms:
-- positive for assets (bank 5000 = owns 5000), negative for credit debt
-- (credit -2000 = owes 2000; the form collects a positive "debt owed"
-- number and negates it client-side). Balances = opening_base + net flow.
-- opening_currency/opening_date record what the user typed (audit + A4 display).
-- IDEMPOTENT: safe to re-run. Existing accounts backfill to zero.

alter table public.accounts add column if not exists opening_base numeric not null default 0;

alter table public.accounts add column if not exists opening_currency text not null default 'MXN';

alter table public.accounts add column if not exists opening_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_opening_currency_check'
  ) then
    alter table public.accounts
      add constraint accounts_opening_currency_check
      check (opening_currency in ('MXN', 'USD'));
  end if;
end
$$;
