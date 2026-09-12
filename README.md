# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context —
it is kept current so a fresh session can continue from here.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status
- `context-docs/07-ui-system.md` — visual/interaction reference (locked UI rules)
- `context-docs/conventions.md` — working agreements (commits, secrets, UI rules)

## Status

Phases 0–6 built and pushed: offline-first sync, transactions with splits/tags/FX
freeze, accounts with live balances, custom categories, budgets, recurring rules,
bank-style home (hero, charts, bills, balances), password-first auth.
Phase 7 done in code (lazy dashboard, verified icons, contrast + PWA checks in CI).
Phase 8 code done: 39 unit tests in CI, release + QA-matrix guide written.
Open: Cloudflare deploy + manual matrix (your steps in `context-docs/08-release.md`).

## Quickstart

```powershell
node --version; npm --version   # Node 24 LTS
npm install
Copy-Item .env.example .env     # then fill Supabase + PowerSync values
node scripts/check-supabase.mjs # verifies .env without leaking secrets
npm run dev                     # http://localhost:5173, hot reload
npm run lint; npm run typecheck; npm run build
```

Supabase SQL in `supabase/migrations/` applies in numeric order via the Dashboard
SQL editor; PowerSync Sync Streams paste from `powersync/sync-config.yaml`.
Details per phase in `context-docs/0*.md`.
