-- 0013_fx_display.sql — remember the rate so history survives a base switch.
-- transactions.base_currency records which base base_amount is frozen in;
-- transactions.fx_rate records the currency -> base rate used at creation
-- (audit + "rate used" display + fallback). Clients convert to the *current*
-- base on read (amount * rate on/before txn_date, else frozen base_amount).
-- accounts.opening_amount records the typed opening number so openings convert
-- the same way (opening_base stays the frozen signed value + fallback).
-- The recurring generator persists the same columns for rows it creates.
-- IDEMPOTENT: safe to re-run.

alter table public.transactions add column if not exists base_currency text;

alter table public.transactions add column if not exists fx_rate numeric;

alter table public.accounts add column if not exists opening_amount numeric not null default 0;

-- Backfill the base from each household's (first) user row, else MXN.
update public.transactions t
set base_currency = coalesce(
  (select base_currency from public.users u where u.household_id = t.household_id limit 1),
  'MXN'
)
where t.base_currency is null;

-- Backfill the rate actually used: base_amount / amount (1 for same-currency).
update public.transactions
set fx_rate = case when amount <> 0 then base_amount / amount else 1 end
where fx_rate is null;

-- Existing openings: typed number unknown, approximate with |opening_base|.
update public.accounts
set opening_amount = abs(opening_base)
where opening_amount = 0 and opening_base <> 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_base_currency_check'
  ) then
    alter table public.transactions
      add constraint transactions_base_currency_check
      check (base_currency in ('MXN', 'USD'));
  end if;
end
$$;

create index if not exists transactions_base_currency_idx
  on public.transactions (base_currency);

-- Recurring generator: persist base_currency + fx_rate like client writes.
create or replace function public.generate_due_recurring()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  hh_base text;
  fx numeric;
  created int := 0;
  guard int;
begin
  for r in
    select * from public.recurring_rules where is_active and next_due <= current_date
  loop
    -- Single-user v1: household base currency comes from its (first) user row.
    select base_currency into hh_base
    from public.users where household_id = r.household_id limit 1;
    if hh_base is null then
      hh_base := 'MXN';
    end if;

    if r.currency = hh_base then
      fx := 1;
    else
      -- Rate on/before the due date; fall back to latest known.
      select rate into fx from public.exchange_rates
      where base_currency = r.currency and target_currency = hh_base
        and rate_date <= r.next_due
      order by rate_date desc limit 1;
      if fx is null then
        select rate into fx from public.exchange_rates
        where base_currency = r.currency and target_currency = hh_base
        order by rate_date desc limit 1;
      end if;
      if fx is null then
        raise notice 'no FX rate % -> %, skipping rule %', r.currency, hh_base, r.id;
        continue;
      end if;
    end if;

    -- Catch up overdue occurrences; guard caps runaway loops.
    guard := 0;
    while r.next_due <= current_date and guard < 150 loop
      insert into public.transactions
        (household_id, account_id, category_id, amount, currency, base_amount,
         base_currency, fx_rate, txn_date, kind, note, recurring_rule_id)
      select r.household_id, r.account_id, r.category_id, r.amount, r.currency,
        r.amount * fx, hh_base, fx, r.next_due, c.kind, r.note, r.id
      from public.categories c where c.id = r.category_id;

      r.next_due := (
        case r.cadence
          when 'weekly' then r.next_due + 7
          when 'biweekly' then r.next_due + 14
          when 'monthly' then r.next_due + interval '1 month'
          when 'quarterly' then r.next_due + interval '3 months'
          when 'yearly' then r.next_due + interval '1 year'
          when 'custom' then
            case coalesce(r.interval_unit, 'month')
              when 'day' then r.next_due + coalesce(r.interval_n, 1)
              when 'week' then r.next_due + coalesce(r.interval_n, 1) * 7
              else r.next_due + (coalesce(r.interval_n, 1) || ' months')::interval
            end
        end
      )::date;
      created := created + 1;
      guard := guard + 1;
    end loop;

    update public.recurring_rules set next_due = r.next_due where id = r.id;
  end loop;
  return created;
end;
$$;
