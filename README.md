# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status

## Status

Phase 6 revised: single bank-style home (balance hero, quick actions, budgets,
activity, charts) with 4-item nav (see `context-docs/06b-unified-home.md`).
Next: Phase 7 PWA polish, accessibility, and performance.

## Quickstart

```powershell
node --version; npm --version
npm install
npm run dev      # frontend only, no backend yet
npm run lint; npm run typecheck; npm run build
```
