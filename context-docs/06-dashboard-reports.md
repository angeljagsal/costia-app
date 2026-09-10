# 06 — Dashboard & Reports (Phase 6 close-out)

Date: 2026-09-11.

## Shared chart/report foundation

- `recharts` installed (watch the cost: main bundle 684 → 1135 KB,
  gzip 194 → 325 KB — Phase 7 will code-split route-level chunks).
- `src/lib/format.ts` — `formatMoney`, `formatDay`, `formatMonthLabel`
  (es-MX/en-US via `Intl`, graceful fallbacks).
- `src/data/periods.ts` — added `monthStart/monthEnd/shiftMonth/monthRange`.
- `src/data/reports.ts` — `useCategoryTotals` (split-proportional, per kind),
  `useMonthlyFlow` (income vs expenses per YYYY-MM), `useBalanceHistory`
  (exact month-end balances via cumulative signed base over full history —
  no snapshots needed).
- `src/data/accounts.ts` — `useAccountBalances` + `accountTypeLabel`
  extracted for reuse (Accounts page refactored onto them).
- `src/components/BudgetProgress.tsx` — compact budget row shared by
  Dashboard and Reports (Budgets page keeps its full card; bar + state
  helpers live in `src/data/budgets.ts`).
- Charts use `currentColor` ticks and `var(--surface/border/text)` tooltip
  styles so they follow light/dark without JS theme reads.

## Dashboard (all 6 widgets)

Budget overview (current-period bars) · Recent 10 (localized names, ± colors)
· Category pie for the current month (HTML legend with amounts, not just
tooltips) · Income-vs-expenses 6-month bars · `UpcomingBills` (unchanged
reuse) · Balances grouped by account type with subtotals + grand total.

## Reports

- Presets (month / 3 / 6 / year / custom range) + Totals (income, expenses,
  net) + expense category breakdown (accessible HTML bars) + monthly trend
  bars + cumulative balance-history line + budgets-vs-actual rows.
- `Sections.tsx` placeholder module deleted; router points at real pages.

## Verified

- `lint` 0 warnings · `typecheck` clean · `build` green.
- Your checks: with a few weeks of varied test data, confirm pie slices match
  the Transactions list, trend bars match monthly sums, and the balance line
  ends at the Accounts total.

## Next: Phase 7 — PWA polish + a11y + perf

Route-level code-splitting (recharts!), maskable icon artwork + maskable.app
check, splash flash review, Lighthouse PWA audit on Windows + Pixel 9 Pro XL,
keyboard/contrast pass, multi-tab PowerSync support decision.
