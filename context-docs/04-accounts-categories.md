# 04 — Accounts & Categories (Phase 4 close-out)

Date: 2026-09-11.

## Custom categories (schema decision)

Global catalog rows keep `household_id NULL` + `key`; custom rows carry the
household + free-text `label` with `key NULL` (Postgres unique ignores NULLs).
Migration `0009_custom_categories.sql` adds the columns, drops `key` NOT NULL,
and replaces the catalog-read policy with scoped select/insert/update/delete.
Sync Streams `categories` query now mirrors it (global + own household) —
**re-paste `powersync/sync-config.yaml` into the dashboard and Deploy** so
custom categories sync (Validate first).

Client `AppSchema.categories` gained both columns. Note: this alters an
already-synced table on existing devices; data is test-only, and if the local
DB ever complains, Application → Clear site data re-syncs from scratch.

## Accounts screen

- Total balance card + per-account balance, all in base currency, computed
  live from signed `base_amount` (`-` expense, `+` income).
- Create (name + 5 types), delete with guard (`accounts.errHasTransactions`
  when transactions reference it).

## Categories screen

- Catalog (read-only chips) + custom section per kind, custom create
  (kind toggle + label), inline rename, delete with usage guard across
  transactions, splits, budgets, and recurring rules.
- Transaction form/list updated to the `{ key, label }` display shape.

## Auth change (same day, ADR-007 revised)

Magic links proved flaky (OTP 429s, inbox delays). Email + password is now
primary on the login screen (password tab default, sign-in + create-account),
magic link stays as fallback tab. No Supabase dashboard change needed.
Optional friction reducer: Auth → Providers → Email → **Confirm email OFF**
lets sign-ups land straight in the app; with it ON the UI explains the
confirmation step. Login also names the 429 state explicitly now.

## Verified

- `lint` 0 warnings · `typecheck` clean · `build` green.
- Your checks: apply `0009` in SQL editor, re-deploy sync config, then in the
  app create an account + a custom category + a transaction using both.

## Next: Phase 5 — Budgets & Recurring

Budget CRUD + spent tracking (80/100% badges, no rollover), recurring rule
CRUD (server `generate_due_recurring()` already scheduled), Upcoming Bills
widget data. No new migrations expected.
