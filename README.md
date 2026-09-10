# Costia — Personal Expense Tracker PWA

Offline-first personal finance app (Windows + Android). See `context-docs/` for all context.

- `context-docs/expense-app-context.md` — scope + requirements (source of truth)
- `context-docs/architecture.md` — system, data model, PWA rules
- `context-docs/phased-plan.md` — phased build plan + status

## Status

Phase 1 done: installable PWA shell with routing, magic-link auth wiring,
en/es-MX, system+manual theme (`lint`, `typecheck`, `build` green, preview smoke-tested).
Next: Phase 2 data layer — needs Supabase project (see `context-docs/01-shell-auth-i18n.md`).

## Quickstart

```powershell
node --version; npm --version
npm install
npm run dev      # frontend only, no backend yet
npm run lint; npm run typecheck; npm run build
```
