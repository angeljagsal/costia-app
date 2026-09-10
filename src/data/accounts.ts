import { useQuery } from '@powersync/react';
import type { AppDatabase } from '../powersync/db';
import type { Account, AccountType } from './types';

export function useAccounts(householdId: string | null): Account[] {
  const { data } = useQuery<Account>(
    'SELECT * FROM accounts WHERE household_id = ? ORDER BY name COLLATE NOCASE',
    [householdId ?? '']
  );
  return data;
}

export function useAccount(id: string | undefined): Account | null {
  const { data } = useQuery<Account>('SELECT * FROM accounts WHERE id = ? LIMIT 1', [id ?? '']);
  return data[0] ?? null;
}

export interface AccountBalance {
  account_id: string;
  balance: number;
}

/** Signed base_amount totals per account (expenses negative). */
export function useAccountBalances(householdId: string | null): AccountBalance[] {
  const { data } = useQuery<AccountBalance>(
    `SELECT account_id, SUM(CASE WHEN kind = 'expense' THEN -base_amount ELSE base_amount END) AS balance
     FROM transactions WHERE household_id = ? GROUP BY account_id`,
    [householdId ?? '']
  );
  return data;
}

export async function createAccount(
  db: AppDatabase,
  householdId: string,
  name: string,
  type: AccountType
): Promise<string> {
  const clean = name.trim();
  if (!clean) throw new Error('accounts.errName');
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO accounts (id, household_id, name, type, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, householdId, clean, type, new Date().toISOString()]
  );
  return id;
}

export async function deleteAccount(db: AppDatabase, id: string): Promise<void> {
  const used = await db.getOptional<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transactions WHERE account_id = ?',
    [id]
  );
  if ((used?.n ?? 0) > 0) throw new Error('accounts.errHasTransactions');
  await db.execute('DELETE FROM accounts WHERE id = ?', [id]);
}
