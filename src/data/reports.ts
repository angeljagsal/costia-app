import { useQuery } from '@powersync/react';
import { openingDisplaySQL, txnDisplaySQL } from './display';
import type { Kind } from './types';

export interface BuiltQuery {
  sql: string;
  params: (string | number | null)[];
}

export interface CategoryTotal {
  category_id: string;
  key: string | null;
  label: string | null;
  total: number;
}

/** Display-base totals per category over a date range (split-proportional). */
export function buildCategoryTotalsQuery(
  householdId: string | null,
  kind: Kind,
  from: string,
  to: string,
  displayBase: string
): BuiltQuery {
  return {
    sql: `SELECT c.id AS category_id, c.key AS key, c.label AS label,
       COALESCE(SUM(s.amount * (${txnDisplaySQL('t', displayBase)}) / t.amount), 0) AS total
     FROM transaction_splits s
     JOIN transactions t ON t.id = s.transaction_id
     JOIN categories c ON c.id = s.category_id
     WHERE t.household_id = ? AND c.kind = ? AND t.txn_date >= ? AND t.txn_date <= ?
     GROUP BY c.id ORDER BY total DESC`,
    params: [householdId ?? '', kind, from, to],
  };
}

export function useCategoryTotals(
  householdId: string | null,
  kind: Kind,
  from: string,
  to: string,
  displayBase: string
): CategoryTotal[] {
  const { sql, params } = buildCategoryTotalsQuery(householdId, kind, from, to, displayBase);
  const { data } = useQuery<CategoryTotal>(sql, params);
  return data;
}

export interface MonthFlow {
  /** YYYY-MM */
  month: string;
  income: number;
  expenses: number;
}

/** Per-month display-base income vs expenses inside a range. */
export function buildMonthlyFlowQuery(
  householdId: string | null,
  from: string,
  to: string,
  displayBase: string
): BuiltQuery {
  return {
    sql: `SELECT substr(t.txn_date, 1, 7) AS month,
       SUM(CASE WHEN t.kind = 'income' THEN (${txnDisplaySQL('t', displayBase)}) ELSE 0 END) AS income,
       SUM(CASE WHEN t.kind = 'expense' THEN (${txnDisplaySQL('t', displayBase)}) ELSE 0 END) AS expenses
     FROM transactions t
     WHERE t.household_id = ? AND t.txn_date >= ? AND t.txn_date <= ?
     GROUP BY month ORDER BY month`,
    params: [householdId ?? '', from, to],
  };
}

export function useMonthlyFlow(
  householdId: string | null,
  from: string,
  to: string,
  displayBase: string
): MonthFlow[] {
  const { sql, params } = buildMonthlyFlowQuery(householdId, from, to, displayBase);
  const { data } = useQuery<MonthFlow>(sql, params);
  return data;
}

export interface AccountNet {
  account_id: string;
  net: number;
}

/**
 * Signed display-base flow per account inside a date range (income +,
 * expense −, transfer in +, transfer out −). Openings excluded (flow only).
 */
export function buildAccountPeriodNetQuery(
  householdId: string | null,
  from: string,
  to: string,
  displayBase: string
): BuiltQuery {
  const d = txnDisplaySQL('t', displayBase);
  return {
    sql: `SELECT account_id, SUM(net) AS net FROM (
       SELECT account_id,
         CASE WHEN kind = 'income' THEN (${d})
              ELSE -(${d}) END AS net
       FROM transactions t
       WHERE household_id = ? AND kind IN ('income', 'expense')
         AND t.txn_date >= ? AND t.txn_date <= ?
       UNION ALL
       SELECT to_account_id AS account_id, (${d}) AS net
       FROM transactions t
       WHERE household_id = ? AND kind = 'transfer'
         AND t.txn_date >= ? AND t.txn_date <= ?
       UNION ALL
       SELECT account_id, -(${d}) AS net
       FROM transactions t
       WHERE household_id = ? AND kind = 'transfer'
         AND t.txn_date >= ? AND t.txn_date <= ?
     ) GROUP BY account_id`,
    params: [householdId ?? '', from, to, householdId ?? '', from, to, householdId ?? '', from, to],
  };
}

export function useAccountPeriodNet(
  householdId: string | null,
  from: string,
  to: string,
  displayBase: string
): AccountNet[] {
  const { sql, params } = buildAccountPeriodNetQuery(householdId, from, to, displayBase);
  const { data } = useQuery<AccountNet>(sql, params);
  return data;
}

export interface BalancePoint {
  /** YYYY-MM */
  month: string;
  balance: number;
}

export function buildBalanceHistoryQuery(
  householdId: string | null,
  toMonth: string,
  displayBase: string
): BuiltQuery {
  const d = txnDisplaySQL('t', displayBase);
  return {
    sql: `SELECT substr(t.txn_date, 1, 7) AS month,
       SUM(CASE WHEN t.kind = 'income' THEN (${d})
                WHEN t.kind = 'expense' THEN -(${d})
                ELSE 0 END) AS net
     FROM transactions t
     WHERE t.household_id = ? AND substr(t.txn_date, 1, 7) <= ?
     GROUP BY month ORDER BY month`,
    params: [householdId ?? '', toMonth],
  };
}

export function buildBalanceSeedQuery(
  householdId: string | null,
  toMonth: string,
  displayBase: string
): BuiltQuery {
  return {
    sql: `SELECT COALESCE(SUM(${openingDisplaySQL('a', displayBase)}), 0) AS seed
     FROM accounts a
     WHERE a.household_id = ?
       AND (a.opening_date IS NULL OR substr(a.opening_date, 1, 7) <= ?)`,
    params: [householdId ?? '', toMonth],
  };
}

/**
 * Month-end balances up to `toMonth`: converted openings as the seed plus
 * cumulative converted net flow (no stored snapshots needed).
 */
export function useBalanceHistory(
  householdId: string | null,
  fromMonth: string,
  toMonth: string,
  displayBase: string
): BalancePoint[] {
  const flow = buildBalanceHistoryQuery(householdId, toMonth, displayBase);
  const seed = buildBalanceSeedQuery(householdId, toMonth, displayBase);
  const { data } = useQuery<{ month: string; net: number }>(flow.sql, flow.params);
  const { data: seedRows } = useQuery<{ seed: number }>(seed.sql, seed.params);
  let running = seedRows[0]?.seed ?? 0;
  const points: BalancePoint[] = [];
  for (const row of data) {
    running += row.net ?? 0;
    if (row.month >= fromMonth) points.push({ month: row.month, balance: running });
  }
  return points;
}
