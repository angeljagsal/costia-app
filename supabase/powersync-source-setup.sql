-- PowerSync source setup — run ONCE in Supabase Dashboard → SQL editor.
-- NOT a numbered migration: it contains a secret and targets a fresh instance.
--
-- 1. Replace <STRONG_RANDOM_PASSWORD> with a generated password
--    (e.g. `openssl rand -base64 24`). Save it in your password manager —
--    the PowerSync dashboard connection step asks for it.
-- 2. Run the whole file. Expect: role created, grants ok, publication created.

-- Read-only replication role for the PowerSync service.
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD '<STRONG_RANDOM_PASSWORD>';

-- Read-only access to current tables ...
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;

-- ... and to any tables created later.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Logical replication feed. MUST be named "powersync".
-- Personal scale: replicating all tables is fine (per PowerSync docs).
CREATE PUBLICATION powersync FOR ALL TABLES;

-- Verify with:
--   select * from pg_publication where pubname = 'powersync';
--   select rolname from pg_roles where rolname = 'powersync_role';
