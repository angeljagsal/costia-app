# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status

## Status

Phase 4 done: accounts & categories CRUD with live balances, custom household
categories (migration 0009), and password-first login (`lint`, `typecheck`,
`build` green).
Next: Phase 5 budgets & recurring UI (see `context-docs/04-accounts-categories.md`
for your two dashboard steps: apply 0009, re-deploy sync config).

## Quickstart

```powershell
node --version; npm --version
npm install
npm run dev      # frontend only, no backend yet
npm run lint; npm run typecheck; npm run build
```
