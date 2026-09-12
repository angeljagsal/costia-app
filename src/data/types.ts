export type Kind = 'expense' | 'income' | 'transfer';
export type Currency = 'MXN' | 'USD';
export type AccountType = 'bank' | 'cash' | 'credit' | 'digital_wallet' | 'investment';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  /** Signed net-worth contribution in base terms (credit debt stored negative). */
  opening_base: number;
  /** Typed opening number (>= 0) so openings convert on base switch. */
  opening_amount: number;
  opening_currency: string;
  opening_date: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  /** Catalog key (global rows) — resolves via `categories.<key>` dict. */
  key: string | null;
  kind: Kind;
  sort: number;
  household_id: string | null;
  /** Free-text name (custom household rows). */
  label: string | null;
}

export interface Tag {
  id: string;
  household_id: string;
  name: string;
}

export interface TransactionRow {
  id: string;
  household_id: string;
  account_id: string;
  /** Destination for transfers, null otherwise. */
  to_account_id: string | null;
  /** Null for transfers (no category). */
  category_id: string | null;
  amount: number;
  currency: string;
  base_amount: number;
  /** Base the frozen base_amount is denominated in (0013; legacy rows backfilled). */
  base_currency: string | null;
  /** currency -> base_currency rate used at creation (audit + fallback). */
  fx_rate: number | null;
  txn_date: string;
  kind: string;
  note: string | null;
  recurring_rule_id: string | null;
  created_at: string;
}

export interface SplitRow {
  id: string;
  transaction_id: string;
  category_id: string;
  amount: number;
}

/** Transaction joined with display names for lists. */
export interface TransactionView extends TransactionRow {
  account_name: string;
  to_account_name: string | null;
  category_key: string | null;
  category_label: string | null;
  /** Row value converted to the requested display base (see display.ts). */
  display_amount: number;
}

export interface SplitInput {
  categoryId: string;
  amount: number;
}

export interface TransactionInput {
  accountId: string;
  /** Destination for transfers. */
  toAccountId?: string;
  /** Ignored for transfers (must be empty). */
  categoryId?: string;
  amount: number;
  currency: Currency;
  kind: Kind;
  /** YYYY-MM-DD */
  txnDate: string;
  note?: string;
  /** Empty/omitted = single-category transaction. Must sum to amount. */
  splits?: SplitInput[];
  tagIds?: string[];
}

export interface TransactionFilters {
  search: string;
  kind: '' | Kind;
  categoryId: string;
  accountId: string;
  tagId: string;
  /** YYYY-MM-DD, empty = unbounded */
  from: string;
  to: string;
  sort: 'newest' | 'oldest' | 'amount';
}

export const EMPTY_FILTERS: TransactionFilters = {
  search: '',
  kind: '',
  categoryId: '',
  accountId: '',
  tagId: '',
  from: '',
  to: '',
  sort: 'newest',
};
