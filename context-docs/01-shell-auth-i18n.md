# 01 — PWA shell + routing + auth + i18n + theme (Phase 1 close-out)

Date: 2026-09-10.

## What was built

- **Routing** (`src/app/router.tsx`): 11 routes — `/`, `/transactions`,
  `/transactions/new`, `/transactions/:id/edit`, `/accounts`, `/categories`,
  `/budgets`, `/recurring`, `/reports`, `/settings`, `/login` + 404.
  Guarded by `RequireAuth` (`src/components/RequireAuth.tsx`).
- **Layout** (`src/components/Layout.tsx`): sticky header (status pill,
  sign-out, dev banner), sidebar on desktop, scrollable bottom nav on mobile.
  `100dvh`, `viewport-fit=cover`, `env(safe-area-inset-*)` in `src/index.css`.
- **Theme** (`src/theme/`): system default + manual override, persisted
  `costia:theme`, follows OS changes live, Tailwind v4 class dark mode.
- **i18n** (`src/i18n/`): `en` + `es-MX` dictionaries, browser-language
  detection (es → es-MX), persisted `costia:locale`, switcher in Settings.
- **Auth** (`src/auth/`, `src/lib/supabase.ts`): Supabase email magic link,
  session restore + `onAuthStateChange`, `/login` with sent/error states and
  setup instructions when unconfigured. `VITE_DEV_AUTH_BYPASS=true` allows
  browsing the shell before the Supabase project exists (dev only, default off).
- **Sync stub** (`src/sync/`): online/offline pill. Real PowerSync engine in Phase 2.
- **PWA** (`vite.config.ts`, `scripts/gen-pwa-icons.mjs`): `vite-plugin-pwa`
  generateSW, manifest (standalone, white theme/bg, any + maskable icons),
  placeholder PNG icons (real artwork + maskable.app check in Phase 7).
- **Settings**: working locale / theme / base-currency (MXN|USD, local-only
  until Phase 2 moves it to `users.base_currency`) / backend status.

## Decisions

- Tailwind v4 via `@tailwindcss/vite` (no config file, CSS-first).
- Kept `oxlint`; each context lives in its `useX.ts` hook file (zero lint warnings).
- Prettier owns formatting; `context-docs/` + `dist/` ignored (`.prettierignore`).

## Verified

- `lint` 0 warnings · `typecheck` clean · `build` green (SW + manifest emitted).
- `vite preview` smoke test: `/`, `/login`, `/settings`, `/transactions`,
  `/manifest.webmanifest`, `/pwa-192x192.png`, `/sw.js` all HTTP 200.

## Your steps (need dashboard logins, can't do from here)

1. **Supabase**: create project → copy Data API URL + a publishable key
   (`sb_publishable_...`, Settings → API Keys) into `.env`
   (see `.env.example`) → restart dev server → test magic-link login.
   Enable `pg_cron` later in Phase 2/5 (needs project first).
2. **Cloudflare Pages**: connect repo, build `npm run build`, output `dist`.
3. **Device check**: install preview on Windows + Pixel 9 Pro XL, run
   Lighthouse PWA audit, report issues for Phase 7.

## Next: Phase 2 — Data layer + offline sync

Needs the Supabase project from step 1: Postgres migrations + RLS,
PowerSync rules + local SQLite schema, repositories, category seeds, FX cache.
