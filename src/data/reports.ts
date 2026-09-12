import { useQuery } from '@powersync/react';
import type { Kind } from './types';

export interface CategoryTotal {
  category_id: string;
  key: string | null;
  label: string | null;
  total: number;
}

/** Base-currency totals per category over a date range (split-proportional). */
export function useCategoryTotals(
  householdId: string | null,
  kind: Kind,
  from: string,
  to: string
): CategoryTotal[] {
  const { data } = useQuery<CategoryTotal>(
    `SELECT c.id AS category_id, c.key AS key, c.label AS label,
       COALESCE(SUM(s.amount * t.base_amount / t.amount), 0) AS total
     FROM transaction_splits s
     JOIN transactions t ON t.id = s.transaction_id
     JOIN categories c ON c.id = s.category_id
     WHERE t.household_id = ? AND c.kind = ? AND t.txn_date >= ? AND t.txn_date <= ?
     GROUP BY c.id ORDER BY total DESC`,
    [householdId ?? '', kind, from, to]
  );
  return data;
}

export interface MonthFlow {
  /** YYYY-MM */
  month: string;
  income: number;
  expenses: number;
}

/** Per-month base-currency income vs expenses inside a range. */
export function useMonthlyFlow(householdId: string | null, from: string, to: string): MonthFlow[] {
  const { data } = useQuery<MonthFlow>(
    `SELECT substr(t.txn_date, 1, 7) AS month,
       SUM(CASE WHEN t.kind = 'income' THEN t.base_amount ELSE 0 END) AS income,
       SUM(CASE WHEN t.kind = 'expense' THEN t.base_amount ELSE 0 END) AS expenses
     FROM transactions t
     WHERE t.household_id = ? AND t.txn_date >= ? AND t.txn_date <= ?
     GROUP BY month ORDER BY month`,
    [householdId ?? '', from, to]
  );
  return data;
}

export interface BalancePoint {
  /** YYYY-MM */
  month: string;
  balance: number;
}

/**
 * Month-end balances up to `toMonth`, derived exactly: cumulative signed
 * base_amount over the full history (no stored snapshots needed).
 */
export function useBalanceHistory(
  householdId: string | null,
  fromMonth: string,
  toMonth: string
): BalancePoint[] {
  const { data } = useQuery<{ month: string; net: number }>(
    `SELECT substr(t.txn_date, 1, 7) AS month,
       SUM(CASE WHEN t.kind = 'income' THEN t.base_amount
                WHEN t.kind = 'expense' THEN -t.base_amount
                ELSE 0 END) AS net
     FROM transactions t
     WHERE t.household_id = ? AND substr(t.txn_date, 1, 7) <= ?
     GROUP BY month ORDER BY month`,
    [householdId ?? '', toMonth]
  );
  let running = 0;
  const points: BalancePoint[] = [];
  for (const row of data) {
    running += row.net ?? 0;
    if (row.month >= fromMonth) points.push({ month: row.month, balance: running });
  }
  return points;
}
