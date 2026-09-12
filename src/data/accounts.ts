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

/**
 * Signed base_amount totals per account. Expenses debit, income credits,
 * transfers debit the source and credit the destination. Transfers never
 * touch income/expense totals — balances only.
 */
export function useAccountBalances(householdId: string | null): AccountBalance[] {
  const { data } = useQuery<AccountBalance>(
    `SELECT account_id, SUM(balance) AS balance FROM (
       SELECT account_id,
         CASE WHEN kind = 'expense' THEN -base_amount ELSE base_amount END AS balance
       FROM transactions WHERE household_id = ? AND kind IN ('expense', 'income')
       UNION ALL
       SELECT to_account_id AS account_id, base_amount AS balance
       FROM transactions WHERE household_id = ? AND kind = 'transfer'
       UNION ALL
       SELECT account_id, -base_amount AS balance
       FROM transactions WHERE household_id = ? AND kind = 'transfer'
     ) GROUP BY account_id`,
    [householdId ?? '', householdId ?? '', householdId ?? '']
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
    'SELECT COUNT(*) AS n FROM transactions WHERE account_id = ? OR to_account_id = ?',
    [id, id]
  );
  if ((used?.n ?? 0) > 0) throw new Error('accounts.errHasTransactions');
  await db.execute('DELETE FROM accounts WHERE id = ?', [id]);
}

/** Localized account-type name. */
export function accountTypeLabel(t: (key: string) => string, type: AccountType): string {
  const map: Record<AccountType, string> = {
    bank: t('accounts.typeBank'),
    cash: t('accounts.typeCash'),
    credit: t('accounts.typeCredit'),
    digital_wallet: t('accounts.typeWallet'),
    investment: t('accounts.typeInvestment'),
  };
  return map[type];
}
