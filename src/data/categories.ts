import { useQuery } from '@powersync/react';
import type { AppDatabase } from '../powersync/db';
import type { Category, Kind } from './types';

/** Global catalog + own household customs, catalogue first. */
export function useCategories(kind?: Kind, householdId?: string | null): Category[] {
  const clauses = ['(household_id IS NULL OR household_id = ?)'];
  const params: string[] = [householdId ?? ''];
  if (kind) {
    clauses.push('kind = ?');
    params.push(kind);
  }
  const { data } = useQuery<Category>(
    `SELECT * FROM categories WHERE ${clauses.join(' AND ')} ORDER BY (household_id IS NOT NULL), sort, label`,
    params
  );
  return data;
}

/** Display name: custom label wins, then localized catalog key. Accepts both
 *  Category rows ({ key, label }) and joined views ({ category_key, category_label }). */
export function categoryName(
  t: (key: string) => string,
  c: {
    key?: string | null;
    label?: string | null;
    category_key?: string | null;
    category_label?: string | null;
  }
): string {
  const label = c.label ?? c.category_label;
  if (label?.trim()) return label.trim();
  const key = c.key ?? c.category_key;
  if (key) {
    const hit = t(`categories.${key}`);
    return hit === `categories.${key}` ? key.replace(/_/g, ' ') : hit;
  }
  return '?';
}

export async function createCategory(
  db: AppDatabase,
  householdId: string,
  kind: Kind,
  label: string
): Promise<string> {
  const clean = label.trim();
  if (!clean) throw new Error('categories.errName');
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO categories (id, key, kind, sort, household_id, label) VALUES (?, NULL, ?, 100, ?, ?)',
    [id, kind, householdId, clean]
  );
  return id;
}

export async function renameCategory(db: AppDatabase, id: string, label: string): Promise<void> {
  const clean = label.trim();
  if (!clean) throw new Error('categories.errName');
  await db.execute('UPDATE categories SET label = ? WHERE id = ? AND household_id IS NOT NULL', [
    clean,
    id,
  ]);
}

async function usedIn(db: AppDatabase, table: string, id: string): Promise<boolean> {
  const row = await db.getOptional<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ${table} WHERE category_id = ?`,
    [id]
  );
  return (row?.n ?? 0) > 0;
}

export async function deleteCategory(db: AppDatabase, id: string): Promise<void> {
  for (const table of ['transactions', 'transaction_splits', 'budgets', 'recurring_rules']) {
    if (await usedIn(db, table, id)) throw new Error('categories.errHasTransactions');
  }
  await db.execute('DELETE FROM categories WHERE id = ? AND household_id IS NOT NULL', [id]);
}
