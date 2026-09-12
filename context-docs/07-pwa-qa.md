# 07 — PWA polish + a11y + perf (Phase 7 close-out)

Date: 2026-09-11.

## Performance: route code-splitting

- Dashboard (sole recharts importer) lazy-loads via `src/app/LazyDashboard.tsx`
  + `DashboardSkeleton` (flat pulse skeletons, disabled under
  `prefers-reduced-motion`).
- Measured: main chunk 1135 → 725 KB (gzip 325 → 211 KB); Dashboard chunk
  415 KB (gzip 117 KB) fetched on demand. Shell + sync boot first.

## Icons: flat brand mark, verified in CI

- `scripts/gen-pwa-icons.mjs` draws full-bleed navy `#292961` + centered white
  rounded square inside the inner 56% (maskable crop-safe). No gradients.
- `public/favicon.svg` matches (navy tile + white mark).
- `scripts/check-pwa.mjs` (`npm run check:pwa`, wired in CI) asserts PNG
  validity, filename dimensions, full-bleed corners, centered mark — 15 checks.
- Remaining eyeball: open one PNG in maskable.app once (user step below).

## Contrast: 23/23 in CI

- `scripts/check-contrast.mjs` (`npm run check:contrast`, wired in CI)
  computes WCAG ratios over the exact token pairs: 4.5:1 body text both
  schemes, 3:1 large display only.
- Found and fixed one real failure: dark income green `#2da160` (4.30) →
  `#3ecf8e` (now 7+).

## Accessibility state

- Labels on every input; `role="group/radiogroup/tablist/progressbar/status"`;
  native `details/summary` and `select` keep keyboard behavior free;
  `aria-pressed/checked/expanded/selected` on custom controls; 2–3px focus
  rings; 44px targets; decorative SVGs `aria-hidden`.
- Charts: section `aria-label`s + HTML legends/tables beside every chart so
  no insight is SVG-only. Tooltips follow the theme via CSS vars.

## Multi-tab decision (locked)

Stay single-DB-per-tab for v1: each tab keeps its own local SQLite and syncs
independently (correct data, just no live cross-tab refresh). The PowerSync
"multiple tabs not enabled" console notice is retained as the honest signal.
Revisit with a shared worker only if multi-user households make stale tabs
a real problem.

## Splash flash

`theme-color` per scheme (light `#f5f5f5` / dark `#1f1f1f`) + manifest
background matching the light app bg. Dark-mode cold start may show one
light frame (single manifest color) — accepted for v1, revisit with
`media`-specific splash if Lighthouse flags it.

## es-MX QA (code-verified, device check pending)

All money/dates go through `Intl` with the active locale; currency codes
render (`MX$` vs `US$`); decimal-comma input accepted in the amount hero.
On-device proofreading pass still open (user step).

## Your Lighthouse + device pass (the only Phase 7 work I can't do)

1. `git pull`, `npm run dev`, open the app on **Windows Chrome/Edge**:
   F12 → Lighthouse → PWA category → run. Send the score + failures.
2. Same on the **Pixel 9 Pro XL** (USB `chrome://inspect` or emulated mobile).
3. Installability + safe-area eyeball on the phone (gesture bar, cutout).
4. Open `public/pwa-maskable-512x512.png` in maskable.app — confirm "fits".

## Next: Phase 8 — Testing + prod cutover

Unit tests (periods, FX freeze, split sums, budget states), a small integration
pass (form → local → upload), Cloudflare Pages deploy, prod verification.
