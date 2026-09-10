# 06b — Unified home revision (supersedes standalone Reports)

Date: 2026-09-11. See `06-dashboard-reports.md` for the original widget/query work.

## What changed and why

- Separate Dashboard + Reports had no visible benefit: two places to look for
  one money story. Home (`/`) is now the single screen; `/reports` redirects
  to `/` (redirect kept so old links/bookmarks don't break).
- Nav went from 8 equal items to 4: **Home, Activity, Budgets, More**.
  Accounts, Categories, Recurring, Settings live under More (`/more`).
- Design moved bank-style (GitLab palette kept): navy hero with total
  balance + this-month in/out, big **New expense / New income** actions that
  open the form pre-set via `?kind=`, tabular statement numerals, deeper
  cards (radius 12, soft shadow).

## Home sections (top to bottom)

Hero → Budget overview → Upcoming bills → Recent 10 → Category pie (month) →
6-month income-vs-expenses → Balance history line → Balances by type.
All queries/charts are the Phase 6 originals, only rearranged.
