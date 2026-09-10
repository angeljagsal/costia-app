# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status

## Status

Phase 6 done: dashboard (6 widgets) and reports (ranges, breakdowns, trends,
balance history) on Recharts (`lint`, `typecheck`, `build` green).
Next: Phase 7 PWA polish, accessibility, and performance (see
`context-docs/06-dashboard-reports.md` for data checks + the code-splitting note).

## Quickstart

```powershell
node --version; npm --version
npm install
npm run dev      # frontend only, no backend yet
npm run lint; npm run typecheck; npm run build
```
