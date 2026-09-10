# 00 — Repo setup (Phase 0 close-out)

Date: 2026-09-10. Branch: `main`. Remote: `https://github.com/angeljagsal/costia-app.git`.

## Toolchain (verified)

- Node v24.19.0 (OpenJS LTS via winget), npm 11.17.0
- Vite ^8.2.2, React ^19.2.8, TypeScript ~6.0.2
- Lint: `oxlint` (Vite 8 template default — replaces ESLint; faster, zero-config)
- Format: `prettier` (`format` / `format:check` scripts, `.prettierrc` singleQuote)
- CI: `.github/workflows/ci.yml` — Node 24, `npm ci` → `lint` → `typecheck` → `build`

## Verified

- `npm install` clean (29 packages, 0 vulnerabilities at scaffold time)
- `npm run lint` — 0 warnings/errors
- `npm run typecheck` — clean
- `npm run build` — `dist/` built in ~1.5s

## Notes / deviations from original plan

- Kept `oxlint` instead of ESLint (template default in 2026; meets "consistent code quality" goal with less config).
- Skipped Husky + lint-staged for now — add when Phase 1 starts producing real code if wanted.
- Cloudflare Pages project not yet linked (needs Cloudflare login) — do before Phase 1 deploy preview.
- `index.html` already carries `viewport-fit=cover` + title "Costia — Expense Tracker" (PWA rule §9).

## Remaining before Phase 1

1. `git push -u origin main` (needs GitHub auth for `angeljagsal/costia-app`).
2. Optional: branch protection on `main` (require CI pass on PR).
3. Optional: link Cloudflare Pages to repo.
