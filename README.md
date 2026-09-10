# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status

## Status

Phase 2 done: offline-first data layer — Supabase schema + RLS + cron,
PowerSync Sync Streams deployed, live connector + local SQLite in the app
(`lint`, `typecheck`, `build` green).
Next: Phase 3 transactions core — or your live sync test first
(see `context-docs/02-data-sync.md`).

## Quickstart

```powershell
node --version; npm --version
npm install
npm run dev      # frontend only, no backend yet
npm run lint; npm run typecheck; npm run build
```
