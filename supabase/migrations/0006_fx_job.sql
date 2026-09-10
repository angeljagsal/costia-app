-- 0006_fx_job.sql — daily Frankfurter (ECB, free, no key) refresh.
-- Caches USD<->MXN both directions per rate_date; historical rows are never
-- updated, so past base_amount values stay stable forever.
--
-- Requires the `http` extension (available on Supabase; enable in
-- Dashboard → Database → Extensions if this file errors, then re-run it).
-- If `http` is unavailable in your region, skip this file: the app falls back
-- to the latest cached rate, and rates can be seeded manually.

create extension if not exists pg_cron;
create extension if not exists http;

create or replace function public.refresh_exchange_rates()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  payload jsonb;
  rate_day date;
  usd_mxn numeric;
begin
  select content::jsonb into payload
  from http_get('https://api.frankfurter.app/latest?from=USD&to=MXN');

  rate_day := (payload ->> 'date')::date;
  usd_mxn := (payload -> 'rates' ->> 'MXN')::numeric;

  if rate_day is null or usd_mxn is null or usd_mxn <= 0 then
    raise notice 'unexpected Frankfurter payload, skipping';
    return;
  end if;

  insert into public.exchange_rates (base_currency, target_currency, rate, rate_date)
  values ('USD', 'MXN', usd_mxn, rate_day),
         ('MXN', 'USD', 1 / usd_mxn, rate_day)
  on conflict (base_currency, target_currency, rate_date) do update
    set rate = excluded.rate, fetched_at = now();
exception
  when others then
    -- A failed FX day must never break the cron chain; the app uses the
    -- latest cached rate until the next successful refresh.
    raise notice 'refresh_exchange_rates failed: %', sqlerrm;
end;
$$;

-- Run daily at 06:00 server time. Re-runnable: replaces any prior schedule.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'fx-refresh-daily') then
    perform cron.unschedule('fx-refresh-daily');
  end if;
  perform cron.schedule('fx-refresh-daily', '0 6 * * *', 'select public.refresh_exchange_rates()');
end;
$$;
