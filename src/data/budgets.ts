import { useQuery } from '@powersync/react';
import type { AppDatabase } from '../powersync/db';
import type { BudgetPeriod } from './types';

export interface BudgetRow {
  id: string;
  household_id: string;
  category_id: string;
  limit_amount: number;
  period: BudgetPeriod;
}

export interface BudgetView extends BudgetRow {
  category_key: string | null;
  category_label: string | null;
}

export type BudgetState = 'onTrack' | 'nearLimit' | 'overLimit';

export function budgetStateFor(spent: number, limit: number): BudgetState {
  if (!(limit > 0)) return 'onTrack';
  const ratio = spent / limit;
  if (ratio >= 1) return 'overLimit';
  if (ratio >= 0.8) return 'nearLimit';
  return 'onTrack';
}

export function budgetBarColor(state: BudgetState): string {
  if (state === 'overLimit') return 'var(--danger)';
  if (state === 'nearLimit') return '#e8930c';
  return 'var(--success)';
}

export function useBudgets(householdId: string | null): BudgetView[] {
  const { data } = useQuery<BudgetView>(
    `SELECT b.*, c.key AS category_key, c.label AS category_label
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE b.household_id = ? ORDER BY c.kind, c.label`,
    [householdId ?? '']
  );
  return data;
}

/**
 * Spent in base currency for an expense category over a date range.
 * Sums split rows converted proportionally (split × txn base / txn amount),
 * so split and single-category transactions count uniformly.
 */
export function useBudgetSpent(
  householdId: string | null,
  categoryId: string,
  from: string,
  to: string
): number {
  const { data } = useQuery<{ spent: number }>(
    `SELECT COALESCE(SUM(s.amount * t.base_amount / t.amount), 0) AS spent
     FROM transaction_splits s
     JOIN transactions t ON t.id = s.transaction_id
     WHERE t.household_id = ? AND s.category_id = ?
       AND t.kind = 'expense' AND t.txn_date >= ? AND t.txn_date <= ?`,
    [householdId ?? '', categoryId, from, to]
  );
  return data[0]?.spent ?? 0;
}

export async function createBudget(
  db: AppDatabase,
  householdId: string,
  categoryId: string,
  limitAmount: number,
  period: BudgetPeriod
): Promise<string> {
  if (!categoryId || !(limitAmount > 0)) throw new Error('budgets.errRequired');
  const id = crypto.randomUUID();
  try {
    await db.execute(
      'INSERT INTO budgets (id, household_id, category_id, limit_amount, period) VALUES (?, ?, ?, ?, ?)',
      [id, householdId, categoryId, limitAmount, period]
    );
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE')) throw new Error('budgets.errDuplicate');
    throw e;
  }
  return id;
}

export async function updateBudgetLimit(
  db: AppDatabase,
  id: string,
  limitAmount: number
): Promise<void> {
  if (!(limitAmount > 0)) throw new Error('budgets.errRequired');
  await db.execute('UPDATE budgets SET limit_amount = ? WHERE id = ?', [limitAmount, id]);
}

export async function deleteBudget(db: AppDatabase, id: string): Promise<void> {
  await db.execute('DELETE FROM budgets WHERE id = ?', [id]);
}
