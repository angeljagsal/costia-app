-- 0008_powersync_ids.sql — PowerSync requires every synced table to have
-- a primary key column named `id` of a text-compatible type (uuid works).
-- Two tables missed that shape in 0001; fix them before any client syncs.
-- Safe: both tables hold no irreplaceable data (tag links are user-recreatable,
-- exchange rates repopulate from the daily FX job).

-- transaction_tags had a composite PK and no id column.
alter table public.transaction_tags add column id uuid default gen_random_uuid();
-- Backfill existing rows (none expected on a fresh instance, but be safe).
update public.transaction_tags set id = gen_random_uuid() where id is null;
alter table public.transaction_tags alter column id set not null;
-- Drop the composite PK, keep its uniqueness as a constraint, promote id.
alter table public.transaction_tags drop constraint transaction_tags_pkey;
alter table public.transaction_tags
  add constraint transaction_tags_unique_pair unique (transaction_id, tag_id);
alter table public.transaction_tags add primary key (id);

-- exchange_rates used a serial integer id; switch to uuid for sync compatibility.
alter table public.exchange_rates drop constraint exchange_rates_pkey;
alter table public.exchange_rates drop column id;
alter table public.exchange_rates
  add column id uuid primary key default gen_random_uuid();
