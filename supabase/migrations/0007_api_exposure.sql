-- 0007_api_exposure.sql — expose tables to the Supabase Data API.
--
-- Since May 2026, new Supabase projects do NOT auto-expose public tables.
-- PowerSync replicates downloads, but client uploads still go through the
-- Data API via supabase-js, so tables must be explicitly granted.
-- RLS (0004) still enforces household isolation on every request.

grant select, insert, update, delete on all tables in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
