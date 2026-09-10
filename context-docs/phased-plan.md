# Phased Plan — Personal Expense Tracker PWA

Conventions: all docs live in `context-docs/`. Status tracked here phase by phase.
Stack: React + Vite + TS + Tailwind, PowerSync SQLite WASM, Supabase Postgres + Auth (magic link),
`pg_cron`, Frankfurter, Cloudflare Pages. Locales: en + es-MX day one.

## Phase 0 — Repo + tooling + docs skeleton [DONE 2026-09-10]

Goal: versioning ready before code.

- [x] `main` branch, `context-docs/` convention
- [x] `.gitignore` (Node/Vite), `.editorconfig`, `README.md`
- [x] Vite React TS scaffold (Node 24 LTS) — `lint`, `typecheck`, `build` green
- [x] `oxlint` (template default, replaces ESLint) + `prettier` + `format` scripts
- [x] GitHub Actions: lint + typecheck + build on PR (Node 24)
- [ ] Cloudflare Pages project linked (preview + prod) — needs Cloudflare login
- [x] `context-docs/{architecture,phased-plan,decisions,00-repo-setup}.md`

Accept: `npm run lint && npm run typecheck && npm run build` green on CI.
Doc: `context-docs/00-repo-setup.md` (written at close of phase).

## Phase 1 — PWA shell + routing + auth + i18n + theme [DONE 2026-09-10]

Goal: installable shell with login, no data yet.

- [x] Routes: `/, /transactions, /transactions/new, /transactions/:id/edit, /accounts, /categories, /budgets, /recurring, /reports, /settings, /login` (+ 404, guarded by RequireAuth).
- [x] Layout: sidebar (desktop) / bottom-nav (mobile), `viewport-fit=cover`, `100dvh`, safe-area padding.
- [x] `vite-plugin-pwa` manifest (maskable 192/512 placeholder icons, standalone, theme/bg) + Workbox SW.
- [x] Theme: system default + manual override persisted.
- [x] i18n: `en` + `es-MX` dictionaries, locale switcher in Settings.
- [x] Supabase Auth magic-link: request link → session restore → guarded routes → logout. Offline: cached session. (Code complete; live login round-trip needs Supabase project — your step.)
- [x] Settings: locale/theme/base-currency controls + backend status. Preview smoke test green (all routes + manifest + SW HTTP 200).

Accept: installs on Windows + Pixel 9 Pro XL, no cutoff, Lighthouse PWA basic pass, login round-trip works.
Note 2026-09-10: shell + build verified locally; device install + Lighthouse + live login need Supabase project + Pages deploy (your steps in `01-shell-auth-i18n.md`).
Doc: `context-docs/01-shell-auth-i18n.md`.

## Phase 2 — Data layer + offline sync [DONE 2026-09-10, live test pending]

Goal: offline-first persistence working.

- [x] Postgres migrations 0001–0008 (schema, seeds, trigger, RLS, cron jobs, API grants, sync ids).
- [x] PowerSync Sync Streams + local SQLite schema mirror (`src/powersync/`).
- [x] Connector: download via instance, upload via Data API (fatal vs retryable split).
- [x] Live SyncProvider (`online/engine/connected/hasSynced/syncError`) + header pill.
- [x] Category seeds (12, keyed) + bilingual dicts; `exchange_rates` + daily Frankfurter job.
- [x] FX freeze helper (`toBaseAmount`); repositories land with Phase 3 forms.
- [ ] Live test: sign in with `VITE_POWERSYNC_URL` set → pill Synced → 12 categories in IndexedDB.

Accept: airplane-mode CRUD, reconnect syncs, `base_amount` never recomputed on read (unit-tested).
Note 2026-09-10: code verified (lint/typecheck/build green); end-to-end download
check needs your live test in `02-data-sync.md`. Full CRUD workout in Phase 3.
Doc: `context-docs/02-data-sync.md` + `supabase/migrations/*`.

## Phase 3 — Transactions core

- Form: amount, currency MXN/USD, kind toggle, category (filtered), account, date, note, splits editor (sum == amount), tags multi-select.
- List: text search (note), date-range / category / account / tag filters, pagination.
- FX freeze: `base_amount = amount * rate(txn_date)` at creation only.

Accept: splits + tags + frozen FX covered by tests.
Doc: `context-docs/03-transactions-fx.md`.

## Phase 4 — Accounts + Categories

- Accounts CRUD (bank|cash|credit|digital_wallet|investment); balance = Σ signed `base_amount`; delete blocked if transactions exist.
- Categories CRUD (expense|income); same delete guard.

Accept: balances correct in base currency, bilingual names.
Doc: `context-docs/04-accounts-categories.md`.

## Phase 5 — Budgets + Recurring

- Budgets CRUD (expense category, limit, weekly|monthly|yearly); spent = current-period Σ; 80%/100% badges; no rollover.
- Recurring CRUD + daily `pg_cron`: `next_due <= today` → insert txn → advance (+7d / +1mo clamp month-end / +1y).
- Upcoming Bills widget: `next_due <= today+7d`, in-app only.

Accept: cron verified with fake clock; cancelling creates zero orphan rows.
Doc: `context-docs/05-budgets-recurring.md`.

## Phase 6 — Dashboard + Reports

- Dashboard: budget overview (month), recent 10, category pie, income-vs-expense trend, upcoming bills, balances by type.
- Reports: monthly totals/trends, category breakdown, budget vs actual, balance history, custom range. All from local SQLite, base currency.
- Charts: Recharts, responsive + tooltips, empty states.

Accept: all widgets + 5 report views render offline with seeded data.
Doc: `context-docs/06-dashboard-reports.md`.

## Phase 7 — PWA polish + a11y + perf

- Re-verify all PWA rules (§5 architecture), maskable.app check, splash flash fix.
- Code-splitting, skeletons, asset optimization; ARIA/keyboard/contrast; es-MX formatting QA.

Accept: Lighthouse PWA ≥90, clean on Pixel 9 Pro XL.
Doc: `context-docs/07-pwa-qa.md` + Lighthouse reports.

## Phase 8 — Testing + prod cutover

- Unit (FX freeze, budget math, recurring advance, splits) 80% critical; integration (forms, offline→online).
- Manual matrix: Windows Chrome/Edge + Android Chrome.
- Cloudflare Pages prod + env vars, optional custom domain + SSL, README + user guide.

Accept: prod install + cross-device sync demo.
Doc: `context-docs/08-release.md`.

---
Estimate: ~40–55 days solo. One phase at a time; each phase closes with its `context-docs/NN-*.md` note + commit.
Next: finish Phase 0 (needs Node LTS installed).
