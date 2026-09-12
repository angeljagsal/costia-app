# Phased Plan — Personal Expense Tracker PWA

Conventions: all docs live in `context-docs/`. Status tracked here phase by phase.
Stack: React + Vite + TS + Tailwind, PowerSync SQLite WASM, Supabase Postgres + Auth (password-first),
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

## Phase 3 — Transactions core [DONE 2026-09-10]

- [x] Design pass first: GitLab-inspired tokens, dark sidebar, shared control
  classes (`.btn/.input/.card`), 44px targets, theme-color per scheme.
- [x] `src/data/` hooks + mutations (accounts/categories/tags/transactions).
- [x] Form: kind toggle, amount (`,`/`.` tolerant), currency, category/account,
  date defaulting to today, note, splits editor (cents-exact), tag chips + inline create.
- [x] List: note search, category/account/tag/date filters, load-more, delete
  with confirm, reactive updates, frozen `≈ base` per row.
- [x] FX freeze at creation via `toBaseAmount`; missing rate blocks save.

Accept: splits + tags + frozen FX covered by tests.
Note 2026-09-10: code verified (lint/typecheck/build green); test the live
round-trip in the app (create online → Supabase Table Editor; offline → saves
instantly). Unit tests arrive in Phase 8 per plan.
Doc: `context-docs/03-transactions.md`.

## Phase 4 — Accounts + Categories [DONE 2026-09-11]

- [x] Migration 0009: custom categories (`label` + nullable `key`, scoped RLS).
- [x] Accounts CRUD (bank|cash|credit|digital_wallet|investment); live balances
  = Σ signed `base_amount`; delete blocked if transactions exist.
- [x] Categories CRUD (catalog read-only + custom create/rename/delete with
  usage guard across transactions, splits, budgets, recurring).
- [x] Auth revised same day: password-first login, magic link fallback (ADR-007).

Accept: balances correct in base currency, bilingual names.
Note: re-deploy `powersync/sync-config.yaml` in dashboard (categories scope
changed); apply `0009` in SQL editor.
Doc: `context-docs/04-accounts-categories.md`.

## Phase 5 — Budgets + Recurring [DONE 2026-09-11]

- [x] Period math (`periods.ts`): calendar month/year, Monday-start week.
- [x] Budgets CRUD + spent via proportional split sums; progress states
  (on-track / near-limit / over); overspend never blocks.
- [x] Recurring CRUD + pause/resume + delete; `UpcomingBills` (today → +7d)
  component built for Dashboard reuse in Phase 6.
- [x] Server cron unchanged (Phase 2); verify live via
  `select public.generate_due_recurring()`.

Accept: cron verified live; cancelling creates zero orphan rows.
Doc: `context-docs/05-budgets-recurring.md`.

## Phase 6 — Dashboard + Reports [DONE 2026-09-11, revised: unified home]

- [x] Single bank-style home: hero (total balance + month in/out + New
  expense/income quick actions with `?kind=` form preset), budget overview,
  upcoming bills, recent 10, category pie, 6-month trend, balance history,
  balances by type.
- [x] Standalone Reports removed (`/reports` → `/`); its sections merged in.
- [x] Nav simplified to Home / Activity / Budgets / More (accounts, categories,
  recurring, settings live under More). Recharts with theme-aware styling.

Accept: all widgets + 5 report views render offline with seeded data.
Note: main bundle grew +450 KB with recharts (gzip +130 KB) — code-split in Phase 7.
Post-revision UI passes (same day): deluxe GitLab light sidebar (sticky),
bank form system (amount hero, grids, radio rows, sticky CTA), stroke icon set
(nav/links only), picker show-all compaction, equal color-coded Save/Cancel.
Full reference: `context-docs/06b-unified-home.md` + `context-docs/07-ui-system.md`.
Doc: `context-docs/06-dashboard-reports.md`.

## Phase 7 — PWA polish + a11y + perf [DONE 2026-09-11, Lighthouse pending]

- [x] Route code-splitting: lazy Dashboard (main 1135→725 KB, charts on demand).
- [x] Flat brand icons + `check-pwa` in CI (15 checks); favicon matches.
- [x] WCAG contrast audit in CI (23 pairs pass; fixed dark income green).
- [x] Dashboard skeletons (reduced-motion aware); a11y roles/labels/rings pass.
- [x] Multi-tab decision: single-DB-per-tab for v1 (documented).
- [ ] Lighthouse PWA audit on Windows + Pixel 9 Pro XL (your step, §07).

Accept: Lighthouse PWA ≥90, clean on Pixel 9 Pro XL.
Doc: `context-docs/07-pwa-qa.md` + Lighthouse reports.

## Phase 8 — Testing + prod cutover

- Unit (FX freeze, budget math, recurring advance, splits) 80% critical; integration (forms, offline→online).
- Manual matrix: Windows Chrome/Edge + Android Chrome.
- Cloudflare Pages prod + env vars, optional custom domain + SSL, README + user guide.

Accept: prod install + cross-device sync demo.
Doc: `context-docs/08-release.md`.

---
Status 2026-09-11: Phases 0–6 built, verified, and pushed. Open threads:
your live checks (sync pill, round-trips, cron observation), then Phase 7.
`context-docs/` is kept current so a fresh session can continue from here.
