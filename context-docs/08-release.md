# 08 — Testing + release (Phase 8 close-out, code side)

Date: 2026-09-11.

## Unit tests: 39 passing (`npm test`)

Runner: vitest 5, node environment, `src/**/*.test.ts`, wired in CI.
PowerSync modules load in SSR-stub mode, so data modules import safely.

| File | Covers |
|---|---|
| `data/periods.test.ts` (11) | month/year/Monday-week ranges, leap years, boundaries |
| `data/budgets.test.ts` (5) | 80%/100% state thresholds, bar colors, zero limit |
| `data/transactions.test.ts` (9) | split persistence rules, cent-exact sums, required/amount/mismatch/rate validation errors |
| `data/categories.test.ts` (4) | label-wins, dict lookup, key humanizing, nameless fallback |
| `lib/format.test.ts` (8) | decimal-comma + thousands parsing, Intl output, fallbacks |
| `lib/fx.test.ts` (2) | same-currency needs no rate, missing rate throws |

Seams added for testability: exported `resolveSplits`, shared `parseAmount`
in `lib/format` (form uses it). Browser/integration tests deliberately
deferred: Playwright's Chromium download + flakiness budget outweighs value
for a solo dev loop — the manual matrix below covers it.

## Cloudflare Pages deploy (your dashboard steps)

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git →
   select `angeljagsal/costia-app`.
2. Build command `npm run build`, output `dist`, root `/`.
3. Env vars (Production **and** Preview): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_POWERSYNC_URL` (values from your `.env`).
   Vars bake at build time — changing one needs a rebuild (Retry deployment).
4. Deploy → open `https://costia-app.pages.dev` → sign up/in.
5. Supabase → Authentication → URL Configuration → add
   `https://costia-app.pages.dev/**` to Redirect URLs (magic links + confirmations).
6. Every push to `main` redeploys automatically.

## Manual QA matrix (run on the deployed URL)

- [ ] Windows Chrome: install PWA, full flow (account → category → transaction → budget → rule), offline airplane test, dark/light toggle.
- [ ] Windows Edge: install + login + one transaction (engine check).
- [ ] Pixel 9 Pro XL Chrome: install from ⋮ menu, safe-area eyeball (gesture bar, cutout), bottom nav reachability, offline test.
- [ ] Cross-device: row created on PC appears on phone and vice versa.
- [ ] Lighthouse PWA on desktop + mobile (see `07-pwa-qa.md`).

## Login + forms refresh (same day)

- Login is now split-screen: navy brand panel (logo, 3 selling points, flat
  deco shapes) + form card. Mobile collapses to brand banner + form.
- Every form carries the legend "Fill in every field. Only fields marked
  optional can be left empty." Optional fields keep their explicit
  "(optional)" tags (notes, tags) or hints (splits).
