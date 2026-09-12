-- 0014_recurring_end_skip.sql — rule end dates plus skip-next-occurrence.
-- recurring_rules.end_date stops generation (rule auto-pauses past it);
-- recurring_rules.skip_date skips exactly that occurrence, then clears itself.
-- The advance math moves into advance_recurring() so the generator and future
-- callers share one implementation. IDEMPOTENT: safe to re-run.

alter table public.recurring_rules add column if not exists end_date date;

alter table public.recurring_rules add column if not exists skip_date date;

create or replace function public.advance_recurring(
  p_cadence text,
  p_interval_n integer,
  p_interval_unit text,
  p_from date
)
returns date
language sql
immutable
as $$
  select (
    case p_cadence
      when 'weekly' then p_from + 7
      when 'biweekly' then p_from + 14
      when 'monthly' then p_from + interval '1 month'
      when 'quarterly' then p_from + interval '3 months'
      when 'yearly' then p_from + interval '1 year'
      when 'custom' then
        case coalesce(p_interval_unit, 'month')
          when 'day' then p_from + coalesce(p_interval_n, 1)
          when 'week' then p_from + coalesce(p_interval_n, 1) * 7
          else p_from + (coalesce(p_interval_n, 1) || ' months')::interval
        end
    end
  )::date;
$$;

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
      if r.end_date is not null and r.next_due > r.end_date then
        r.is_active := false;
        exit;
      end if;
      if r.skip_date is not null and r.next_due = r.skip_date then
        -- Skip exactly this occurrence, then clear so later ones generate.
        r.skip_date := null;
        r.next_due := public.advance_recurring(r.cadence, r.interval_n, r.interval_unit, r.next_due);
        guard := guard + 1;
        continue;
      end if;
      insert into public.transactions
        (household_id, account_id, category_id, amount, currency, base_amount,
         base_currency, fx_rate, txn_date, kind, note, recurring_rule_id)
      select r.household_id, r.account_id, r.category_id, r.amount, r.currency,
        r.amount * fx, hh_base, fx, r.next_due, c.kind, r.note, r.id
      from public.categories c where c.id = r.category_id;

      r.next_due := public.advance_recurring(r.cadence, r.interval_n, r.interval_unit, r.next_due);
      created := created + 1;
      guard := guard + 1;
    end loop;

    update public.recurring_rules
    set next_due = r.next_due, skip_date = r.skip_date, is_active = r.is_active
    where id = r.id;
  end loop;
  return created;
end;
$$;
