# 03 — Transactions core (Phase 3 close-out)

Date: 2026-09-10.

## Design pass (GitLab-inspired, all-ages)

Recorded first because every Phase 3+ screen builds on it:

- Pajamas-like tokens in `src/index.css`: neutral grays, one action blue
  (`#1f75cb` light / `#499ed7` dark), dark navy sidebar (`#292961`),
  green/red/amber semantics.
- All-ages rules: 16px base type, 44px+ targets (`.btn`, `.input`),
  always-visible text labels (no icon-only controls), 3px focus rings.
- Shared classes: `.btn`, `.btn-primary/secondary/danger`, `.input`,
  `.label`, `.card`, `.hint`, `.error-text`, `.page-title`, `.page-sub`.
- Layout: dark sidebar (desktop) with status + sign-out at the bottom,
  white top bar + scrollable bottom nav (mobile).
- PWA `theme-color`: `#f5f5f5` light / `#1f1f1f` dark (manifest + meta).

## Data layer (`src/data/`)

- `types.ts` — rows, inputs, filters shared by hooks and mutations.
- `household.ts` — `useHouseholdId()` from the synced users row (null pre-sync).
- `accounts.ts` / `categories.ts` / `tags.ts` — reactive lists + create/delete
  with friendly i18n-keyed errors (`accounts.errHasTransactions`, `tags.duplicate`).
- `transactions.ts` — `create/update/delete`, `useTransaction(id)`,
  `useTransactions(filters, limit, offset)` with joined account/category names.
- Errors thrown as **i18n keys** (`tx.*`); forms translate, raw fallback otherwise.

## Form (`TransactionForm`, new + edit)

- Expense/Income segmented toggle (resets category on switch), amount
  (accepts `1,234.56` and `1234,56`), MXN/USD, localized category + account
  selects, date (defaults to local today), optional note.
- Splits editor: N rows, live total, cents-exact sum validation.
- Tags: toggle chips + inline creation (duplicate → friendly message).
- Always persists split rows (single whole-amount row when not split) so
  budget queries can sum splits uniformly.
- FX freeze via `toBaseAmount(amount, currency, base, txnDate)`; missing rate
  blocks the save with `tx.errNoFxRate` instead of guessing.
- Edit recomputes `base_amount` for the (possibly changed) date — edits are
  new user actions, not retroactive rate changes.

## List (`Transactions`)

- Search (note), filters (category, account, tag, date range), clear-all,
  limit+1 "load more" pagination, newest first.
- Rows: localized category + account, date, note, ± amount in original
  currency (red/green), frozen `≈ base` conversion underneath.
- Edit link + delete with native confirm; list updates reactively.

## Verified

- `lint` 0 warnings · `typecheck` clean · `build` green.
- Upload path now exercisable end-to-end (Phase 2 download test + this
  phase's writes): create a transaction online and watch it land in Supabase
  Table Editor; go offline and confirm the form still saves instantly.

## Next: Phase 4 — Accounts & Categories

Full CRUD screens reusing `src/data/accounts.ts` (delete guard already in
place) plus user-created categories (schema: nullable `label` alongside
catalog `key` — decision for Phase 4 start).
