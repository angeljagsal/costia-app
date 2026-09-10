# 02 — Data layer + offline sync (Phase 2 close-out)

Date: 2026-09-10.

## Server side (Supabase)

Migrations `supabase/migrations/0001`–`0008`, applied in order via Dashboard SQL editor:

- `0001_schema` — households/users/accounts/categories/transactions/splits/
  tags/transaction_tags/budgets/recurring_rules/exchange_rates + indexes.
  `household_id` denormalized onto every owned row so RLS never joins.
- `0002_seeds` — 12 categories (`key` + `kind` + `sort`, idempotent).
- `0003_auth_trigger` — first magic-link sign-in auto-creates household + users row.
- `0004_rls` — household isolation; splits/links scoped via parent transaction;
  categories + rates are authenticated-read catalogs.
- `0005_recurring_job` — daily `generate_due_recurring()` (creates on due date,
  advances weekly/monthly/yearly with month-end clamp, 150-iteration catch-up cap).
- `0006_fx_job` — daily `refresh_exchange_rates()` from Frankfurter (USD base),
  both directions, failures logged as notices without breaking the chain.
- `0007_api_exposure` — grants for the Data API upload path (required since
  Supabase stopped auto-exposing public tables in May 2026). Grants `anon` too;
  harmless because RLS denies anon everything.
- `0008_powersync_ids` — every synced table has a text-compatible `id` PK
  (uuid). `transaction_tags` gained a surrogate id (pair stays unique);
  `exchange_rates` moved from serial to uuid id.

One-off (not a migration, contains a secret):
`supabase/powersync-source-setup.sql` — `powersync_role` + `powersync` publication.
Password generated locally, stored in password manager + PowerSync dashboard,
then reverted out of the working tree. Never committed.

## Sync service (PowerSync Cloud, Development instance)

- Database Connection → Supabase direct URI as `powersync_role`, SSL verify-full.
- Client Auth → Supabase Auth, JWT secret left empty (new signing keys, JWKS auto).
- Sync Streams `powersync/sync-config.yaml` (mirrors RLS): `household_data`
  (9 household queries, auto-subscribed) + `catalog_data` (categories, rates).
  Fix applied: scalar `= (SELECT …)` rejected by validator — `IN (SELECT …)`
  is the supported form (matches official docs examples). Validated + deployed.

## Client side (this repo)

- Deps: `@powersync/web` 2.3.0, `@powersync/react` 2.0.1.
- `src/powersync/AppSchema.ts` — local SQLite mirror (uuid/text→text,
  numeric→real, date→text, bool→integer). Names match server tables.
- `src/powersync/SupabaseConnector.ts` — download auth via Supabase access
  token; uploads via Data API upsert/update/delete with fatal (22/23/42501)
  vs retryable error split. Adapted from the official react-supabase demo.
- `src/powersync/db.ts` — singleton `costia.db` (WASM SQLite, browser-persisted).
- `src/sync/` — live provider: connects on session, disconnects on sign-out,
  exposes `{ online, engine, connected, hasSynced, syncError }`.
- `PowerSyncContext` wired in `main.tsx` for Phase 3 `useQuery` hooks.
- `src/lib/fx.ts` — frozen conversion: rate on/before txn date, latest fallback,
  1.0 same-currency; throws when no rate exists (caller blocks the save).
- i18n: 12 `categories.<key>` names en + es-MX; sync states for the header pill.
- Header pill now shows Online/Offline (local-only) or Syncing…/Synced/Sync error.

## Verified

- `lint` 0 warnings · `typecheck` clean · `build` green (WASM + worker bundled).
- Supabase reachable with publishable key (`scripts/check-supabase.mjs`).
- Streams Validate clean in dashboard.

## Live test (your steps, needs `npm run dev` + sign-in)

1. Add `VITE_POWERSYNC_URL=https://6aa21da202481fb31b954009.powersync.journeyapps.com`
   to `.env` and restart the dev server.
2. Sign in → header pill should go Syncing… → Synced (green).
3. DevTools → Application → IndexedDB → `costia.db` → `categories` → 12 rows.
4. Supabase Table Editor → insert a test account row in your household →
   it appears locally after a few seconds (visible in IndexedDB `accounts`).
5. Report pill behavior + any console errors. Upload path gets its workout
   in Phase 3 when the app writes its first rows.

## Next: Phase 3 — Transactions core

Form (amount/currency/kind/category/account/date/note/splits/tags), list with
search + filters, FX freeze via `toBaseAmount`, all reads/writes against `db`.
