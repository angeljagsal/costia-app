-- 0010_recurring_intervals.sql — flexible recurrences.
-- Cadences: weekly, biweekly, monthly, quarterly, yearly, custom.
-- Custom rules repeat every interval_n interval_units (day|week|month).
-- Fully re-runnable: discovers the old check name instead of assuming it.

alter table public.recurring_rules
  add column if not exists interval_n integer;

alter table public.recurring_rules
  add column if not exists interval_unit text;

-- Drop whatever cadence check exists (name varies by how 0001 was applied).
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.recurring_rules'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%cadence%';
  if cname is not null then
    execute format('alter table public.recurring_rules drop constraint %I', cname);
  end if;
end
$$;

alter table public.recurring_rules
  add constraint recurring_rules_cadence_check
  check (
    cadence in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom')
    and (cadence <> 'custom' or (coalesce(interval_n, 0) >= 1 and interval_unit in ('day', 'week', 'month')))
    and (cadence = 'custom' or (interval_n is null and interval_unit is null))
  );

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
         txn_date, kind, note, recurring_rule_id)
      select r.household_id, r.account_id, r.category_id, r.amount, r.currency,
        r.amount * fx, r.next_due, c.kind, r.note, r.id
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

-- Re-affirm the daily schedule (idempotent; no-op if already present).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'recurring-daily') then
    perform cron.unschedule('recurring-daily');
  end if;
  perform cron.schedule('recurring-daily', '0 1 * * *', 'select public.generate_due_recurring()');
end;
$$;
