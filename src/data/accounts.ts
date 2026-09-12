import { useQuery } from '@powersync/react';
import { toBaseAmount } from '../lib/fx';
import type { AppDatabase } from '../powersync/db';
import type { Account, AccountType, Currency } from './types';

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
 * Signed balance per account: opening_base + net flow. Expenses debit,
 * income credits, transfers debit the source and credit the destination.
 * Transfers never touch income/expense totals — balances only.
 * Every account is listed, even with zero transactions.
 */
export function useAccountBalances(householdId: string | null): AccountBalance[] {
  const { data } = useQuery<AccountBalance>(
    `SELECT a.id AS account_id, COALESCE(a.opening_base, 0) + COALESCE(t.net, 0) AS balance
     FROM accounts a
     LEFT JOIN (
       SELECT account_id, SUM(balance) AS net FROM (
         SELECT account_id,
           CASE WHEN kind = 'expense' THEN -base_amount ELSE base_amount END AS balance
         FROM transactions WHERE household_id = ? AND kind IN ('expense', 'income')
         UNION ALL
         SELECT to_account_id AS account_id, base_amount AS balance
         FROM transactions WHERE household_id = ? AND kind = 'transfer'
         UNION ALL
         SELECT account_id, -base_amount AS balance
         FROM transactions WHERE household_id = ? AND kind = 'transfer'
       ) GROUP BY account_id
     ) t ON t.account_id = a.id
     WHERE a.household_id = ?`,
    [householdId ?? '', householdId ?? '', householdId ?? '', householdId ?? '']
  );
  return data;
}

export interface OpeningInput {
  /** Typed amount in the opening currency (>= 0; 0 = no opening). */
  amount: number;
  currency: Currency;
  /** YYYY-MM-DD */
  date: string;
}

/**
 * Signed opening in base terms. Credit takes a positive "debt owed" number
 * and stores it negative so every total just works. Pure — unit-tested.
 */
export function signOpening(base: number, type: AccountType): number {
  if (type !== 'credit' || base <= 0) return base;
  return -base;
}

function validateOpening(opening: OpeningInput | undefined): void {
  if (!opening) return;
  if (!(opening.amount >= 0) || !Number.isFinite(opening.amount))
    throw new Error('accounts.errOpening');
  if (opening.amount > 0 && !opening.date) throw new Error('accounts.errOpening');
}

async function openingBase(
  type: AccountType,
  baseCurrency: string,
  opening: OpeningInput | undefined
): Promise<{ base: number; currency: string; date: string | null }> {
  if (!opening || opening.amount <= 0) return { base: 0, currency: baseCurrency, date: null };
  let base: number;
  try {
    base = await toBaseAmount(opening.amount, opening.currency, baseCurrency, opening.date);
  } catch {
    throw new Error('accounts.errNoFxRate');
  }
  return { base: signOpening(base, type), currency: opening.currency, date: opening.date };
}

export async function createAccount(
  db: AppDatabase,
  householdId: string,
  name: string,
  type: AccountType,
  baseCurrency: string,
  opening?: OpeningInput
): Promise<string> {
  const clean = name.trim();
  if (!clean) throw new Error('accounts.errName');
  validateOpening(opening);
  const ob = await openingBase(type, baseCurrency, opening);
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO accounts
       (id, household_id, name, type, opening_base, opening_currency, opening_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, householdId, clean, type, ob.base, ob.currency, ob.date, new Date().toISOString()]
  );
  return id;
}

export async function updateOpening(
  db: AppDatabase,
  id: string,
  type: AccountType,
  baseCurrency: string,
  opening?: OpeningInput
): Promise<void> {
  validateOpening(opening);
  const ob = await openingBase(type, baseCurrency, opening);
  await db.execute(
    'UPDATE accounts SET opening_base = ?, opening_currency = ?, opening_date = ? WHERE id = ?',
    [ob.base, ob.currency, ob.date, id]
  );
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
