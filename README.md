# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status

## Status

Phase 3 done: transactions core — GitLab-inspired all-ages design, reactive
data layer, full transaction form (splits, tags, FX freeze) and filterable
list (`lint`, `typecheck`, `build` green).
Next: Phase 4 accounts & categories CRUD (see `context-docs/03-transactions.md`).

## Quickstart

```powershell
node --version; npm --version
npm install
npm run dev      # frontend only, no backend yet
npm run lint; npm run typecheck; npm run build
```
