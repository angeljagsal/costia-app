import { useQuery } from '@powersync/react';
import { toBaseAmount } from '../lib/fx';
import type { AppDatabase } from '../powersync/db';
import {
  openingDisplayParams,
  openingDisplaySQL,
  txnDisplayParams,
  txnDisplaySQL,
} from './display';
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
 * Signed balance per account in the requested display base: converted opening
 * + converted net flow. Expenses debit, income credits, transfers debit the
 * source and credit the destination. Transfers never touch income/expense
 * totals — balances only. Every account is listed, even with zero transactions.
 */
export function useAccountBalances(
  householdId: string | null,
  displayBase: string
): AccountBalance[] {
  const txnD = txnDisplaySQL('t');
  const openD = openingDisplaySQL('a');
  const { data } = useQuery<AccountBalance>(
    `SELECT a.id AS account_id, (${openD}) + COALESCE(t.net, 0) AS balance
     FROM accounts a
     LEFT JOIN (
       SELECT account_id, SUM(balance) AS net FROM (
         SELECT account_id,
           CASE WHEN kind = 'expense' THEN -(${txnD}) ELSE (${txnD}) END AS balance
         FROM transactions t WHERE household_id = ? AND kind IN ('expense', 'income')
         UNION ALL
         SELECT to_account_id AS account_id, (${txnDisplaySQL('t')}) AS balance
         FROM transactions t WHERE household_id = ? AND kind = 'transfer'
         UNION ALL
         SELECT account_id, -(${txnDisplaySQL('t')}) AS balance
         FROM transactions t WHERE household_id = ? AND kind = 'transfer'
       ) GROUP BY account_id
     ) t ON t.account_id = a.id
     WHERE a.household_id = ?`,
    [
      ...openingDisplayParams(displayBase),
      householdId ?? '',
      ...txnDisplayParams(displayBase),
      ...txnDisplayParams(displayBase), // CASE references the expression twice
      householdId ?? '',
      ...txnDisplayParams(displayBase),
      householdId ?? '',
      ...txnDisplayParams(displayBase),
      householdId ?? '',
    ]
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
  opening: OpeningInput | undefined,
  fxRateOverride?: number | null
): Promise<{ base: number; amount: number; currency: string; date: string | null }> {
  if (!opening || opening.amount <= 0)
    return { base: 0, amount: 0, currency: baseCurrency, date: null };
  let fx: { base: number; rate: number };
  try {
    fx = await toBaseAmount(
      opening.amount,
      opening.currency,
      baseCurrency,
      opening.date,
      fxRateOverride
    );
  } catch {
    throw new Error('accounts.errNoFxRate');
  }
  return {
    base: signOpening(fx.base, type),
    amount: opening.amount,
    currency: opening.currency,
    date: opening.date,
  };
}

export async function createAccount(
  db: AppDatabase,
  householdId: string,
  name: string,
  type: AccountType,
  baseCurrency: string,
  opening?: OpeningInput,
  fxRateOverride?: number | null
): Promise<string> {
  const clean = name.trim();
  if (!clean) throw new Error('accounts.errName');
  validateOpening(opening);
  const ob = await openingBase(type, baseCurrency, opening, fxRateOverride);
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO accounts
       (id, household_id, name, type, opening_base, opening_amount, opening_currency,
        opening_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      householdId,
      clean,
      type,
      ob.base,
      ob.amount,
      ob.currency,
      ob.date,
      new Date().toISOString(),
    ]
  );
  return id;
}

export async function updateOpening(
  db: AppDatabase,
  id: string,
  type: AccountType,
  baseCurrency: string,
  opening?: OpeningInput,
  fxRateOverride?: number | null
): Promise<void> {
  validateOpening(opening);
  const ob = await openingBase(type, baseCurrency, opening, fxRateOverride);
  await db.execute(
    `UPDATE accounts
     SET opening_base = ?, opening_amount = ?, opening_currency = ?, opening_date = ?
     WHERE id = ?`,
    [ob.base, ob.amount, ob.currency, ob.date, id]
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
