-- 0005_recurring_job.sql — daily generator for recurring rules.
-- Only creates the transaction on the day it is due, then advances next_due.
-- Cancelling a rule deletes zero future rows because none are pre-created.
-- Month arithmetic clamps month-ends (Jan 31 + 1 month = Feb 28/29).

create extension if not exists pg_cron;

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

    -- Catch up overdue occurrences; guard caps runaway loops at ~3y weekly.
    guard := 0;
    while r.next_due <= current_date and guard < 150 loop
      insert into public.transactions
        (household_id, account_id, category_id, amount, currency, base_amount,
         txn_date, kind, note, recurring_rule_id)
      select r.household_id, r.account_id, r.category_id, r.amount, r.currency,
        r.amount * fx, r.next_due, c.kind, r.note, r.id
      from public.categories c where c.id = r.category_id;

      r.next_due := (
        case r.cadence
          when 'weekly' then r.next_due + 7
          when 'monthly' then r.next_due + interval '1 month'
          when 'yearly' then r.next_due + interval '1 year'
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

-- Run daily at 01:00 server time. Re-runnable: replaces any prior schedule.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'recurring-daily') then
    perform cron.unschedule('recurring-daily');
  end if;
  perform cron.schedule('recurring-daily', '0 1 * * *', 'select public.generate_due_recurring()');
end;
$$;
