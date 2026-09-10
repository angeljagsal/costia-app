# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status

## Status

Phase 5 done: budgets with progress tracking and recurring rules with
upcoming bills, on Monday-start period math (`lint`, `typecheck`, `build` green).
Next: Phase 6 dashboard & reports (see `context-docs/05-budgets-recurring.md`
for the one cron observation test).

## Quickstart

```powershell
node --version; npm --version
npm install
npm run dev      # frontend only, no backend yet
npm run lint; npm run typecheck; npm run build
```
