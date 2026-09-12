# 05 — Budgets & Recurring (Phase 5 close-out)

Date: 2026-09-11.

## Data layer

- `src/data/periods.ts` — pure date math: calendar month/year, **Monday-start
  week**, `todayLocal`/`addDaysISO`/`getPeriodRange` (all `YYYY-MM-DD`).
- `src/data/budgets.ts` — CRUD + `useBudgetSpent`: sums **split rows**
  converted proportionally (`split × txn base / txn amount`), so split and
  single-category transactions count uniformly. Duplicate
  (household, category, period) surfaces `budgets.errDuplicate`.
- `src/data/recurring.ts` — CRUD + pause/resume (`is_active`) + delete
  (past generated rows survive via server-side `SET NULL`) +
  `useUpcomingBills(today → +7d)`. Views carry `category_kind`; the form has
  an expense/income toggle filtering categories, and amounts render signed
  (+/−, green/red) in the rules list and Upcoming Bills. The server job
  derives `kind` from the category, so no migration was needed.
  (Income support added post-Phase 5; auth moved to password + OAuth the
  same day — see decisions log.)
- Flexible intervals (post-Phase 5): cadences weekly, biweekly, monthly,
  quarterly, yearly, plus custom every-N days/weeks/months. Migration
  `0010_recurring_intervals.sql` (idempotent) extends the check constraint
  and the generator; client `AppSchema` mirrors the new columns. Run 0010
  in the SQL editor; no Sync Streams change needed (same table).

## Budgets page

- Create (expense categories incl. customs, limit, weekly/monthly/yearly),
  per-budget cards with accessible progress bars and three states:
  On track (<80%), Near limit (amber, ≥80%), Over limit (red, ≥100%).
- Inline limit edit, delete with confirm. Overspending never blocks saving —
  budgets track, they don't lock.

## Recurring page

- `UpcomingBills` component on top (also built for Dashboard reuse in Phase 6).
- Create/edit form (account, any-kind category, amount, currency, cadence,
  next-due defaulting to today, note), pause/resume toggle, delete.
- Server `generate_due_recurring()` (daily cron, Phase 2) needs no changes:
  it materializes on due dates with month-end clamping.

## Supporting change

- `categoryName()` now accepts both `Category` rows and joined views, so new
  pages pass rows straight through.

## Verified

- `lint` 0 warnings · `typecheck` clean · `build` green.
- Your checks: create a monthly budget and watch it fill as you add expenses;
  create a rule with next-due = today, run
  `select public.generate_due_recurring()` in SQL editor, confirm the
  transaction appears and `next_due` advanced (cron does this daily on its own).

## Next: Phase 6 — Dashboard & Reports

Widgets (budget overview, recent 10, category pie, income-vs-expense trend,
upcoming bills, balances) reusing `UpcomingBills` + spent/balance queries;
reports with custom ranges; charts library choice (Recharts favored).
