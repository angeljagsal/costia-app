export type Kind = 'expense' | 'income';
export type Currency = 'MXN' | 'USD';
export type AccountType = 'bank' | 'cash' | 'credit' | 'digital_wallet' | 'investment';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
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
  category_id: string;
  amount: number;
  currency: string;
  base_amount: number;
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
  category_key: string | null;
  category_label: string | null;
}

export interface SplitInput {
  categoryId: string;
  amount: number;
}

export interface TransactionInput {
  accountId: string;
  categoryId: string;
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
  categoryId: string;
  accountId: string;
  tagId: string;
  /** YYYY-MM-DD, empty = unbounded */
  from: string;
  to: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  search: '',
  categoryId: '',
  accountId: '',
  tagId: '',
  from: '',
  to: '',
};
