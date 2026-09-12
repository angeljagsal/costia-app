import { useQuery } from '@powersync/react';
import { toBaseAmount } from '../lib/fx';
import { txnDisplaySQL } from './display';
import type { AppDatabase } from '../powersync/db';
import type {
  SplitRow,
  TransactionFilters,
  TransactionInput,
  TransactionRow,
  TransactionView,
} from './types';

const toCents = (n: number) => Math.round(n * 100);

/** Splits to persist: explicit splits, or a single whole-amount row.
 *  Transfers persist no splits. Exported for unit tests;
 *  throws `tx.errSplitMismatch` on imbalance. */
export function resolveSplits(input: TransactionInput): { categoryId: string; amount: number }[] {
  if (input.kind === 'transfer') return [];
  const splits = (input.splits ?? []).filter((s) => s.categoryId && s.amount > 0);
  if (splits.length === 0) {
    if (!input.categoryId) throw new Error('tx.errRequired');
    return [{ categoryId: input.categoryId, amount: input.amount }];
  }
  const total = splits.reduce((sum, s) => sum + toCents(s.amount), 0);
  if (total !== toCents(input.amount)) throw new Error('tx.errSplitMismatch');
  return splits;
}

function validate(input: TransactionInput): void {
  if (!input.accountId || !input.txnDate) throw new Error('tx.errRequired');
  if (!(input.amount > 0)) throw new Error('tx.errAmount');
  if (input.kind === 'transfer') {
    if (!input.toAccountId) throw new Error('tx.errTransferAccounts');
    if (input.toAccountId === input.accountId) throw new Error('tx.errTransferSame');
    if (input.categoryId) throw new Error('tx.errTransferNoCategory');
    if ((input.splits ?? []).some((s) => s.categoryId && s.amount > 0))
      throw new Error('tx.errTransferNoCategory');
    if ((input.tagIds ?? []).length > 0) throw new Error('tx.errTransferNoCategory');
    return;
  }
  if (!input.categoryId) throw new Error('tx.errRequired');
}

export async function createTransaction(
  db: AppDatabase,
  householdId: string,
  baseCurrency: string,
  input: TransactionInput,
  fxRateOverride?: number | null
): Promise<string> {
  validate(input);
  const splits = resolveSplits(input);
  let fx: { base: number; rate: number };
  try {
    fx = await toBaseAmount(
      input.amount,
      input.currency,
      baseCurrency,
      input.txnDate,
      fxRateOverride
    );
  } catch {
    throw new Error('tx.errNoFxRate');
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const isTransfer = input.kind === 'transfer';
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO transactions
        (id, household_id, account_id, to_account_id, category_id, amount, currency, base_amount,
         base_currency, fx_rate, txn_date, kind, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        householdId,
        input.accountId,
        isTransfer ? input.toAccountId : null,
        isTransfer ? null : (input.categoryId ?? null),
        input.amount,
        input.currency,
        fx.base,
        baseCurrency,
        fx.rate,
        input.txnDate,
        input.kind,
        input.note?.trim() || null,
        now,
      ]
    );
    for (const s of splits) {
      await tx.execute(
        'INSERT INTO transaction_splits (id, transaction_id, category_id, amount) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), id, s.categoryId, s.amount]
      );
    }
    for (const tagId of input.tagIds ?? []) {
      await tx.execute(
        'INSERT INTO transaction_tags (id, transaction_id, tag_id) VALUES (?, ?, ?)',
        [crypto.randomUUID(), id, tagId]
      );
    }
  });
  return id;
}

export async function updateTransaction(
  db: AppDatabase,
  id: string,
  baseCurrency: string,
  input: TransactionInput,
  fxRateOverride?: number | null
): Promise<void> {
  validate(input);
  const splits = resolveSplits(input);
  let fx: { base: number; rate: number };
  try {
    fx = await toBaseAmount(
      input.amount,
      input.currency,
      baseCurrency,
      input.txnDate,
      fxRateOverride
    );
  } catch {
    throw new Error('tx.errNoFxRate');
  }
  const isTransfer = input.kind === 'transfer';
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE transactions SET account_id = ?, to_account_id = ?, category_id = ?, amount = ?, currency = ?,
        base_amount = ?, base_currency = ?, fx_rate = ?, txn_date = ?, kind = ?, note = ? WHERE id = ?`,
      [
        input.accountId,
        isTransfer ? input.toAccountId : null,
        isTransfer ? null : (input.categoryId ?? null),
        input.amount,
        input.currency,
        fx.base,
        baseCurrency,
        fx.rate,
        input.txnDate,
        input.kind,
        input.note?.trim() || null,
        id,
      ]
    );
    await tx.execute('DELETE FROM transaction_splits WHERE transaction_id = ?', [id]);
    for (const s of splits) {
      await tx.execute(
        'INSERT INTO transaction_splits (id, transaction_id, category_id, amount) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), id, s.categoryId, s.amount]
      );
    }
    await tx.execute('DELETE FROM transaction_tags WHERE transaction_id = ?', [id]);
    for (const tagId of input.tagIds ?? []) {
      await tx.execute(
        'INSERT INTO transaction_tags (id, transaction_id, tag_id) VALUES (?, ?, ?)',
        [crypto.randomUUID(), id, tagId]
      );
    }
  });
}

export async function deleteTransaction(db: AppDatabase, id: string): Promise<void> {
  // Splits and tag links cascade.
  await db.execute('DELETE FROM transactions WHERE id = ?', [id]);
}

export function useTransaction(id: string | undefined): {
  tx: TransactionRow | null;
  splits: SplitRow[];
  tagIds: string[];
} {
  const key = id ?? '';
  const { data: rows } = useQuery<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ? LIMIT 1',
    [key]
  );
  const { data: splits } = useQuery<SplitRow>(
    'SELECT * FROM transaction_splits WHERE transaction_id = ?',
    [key]
  );
  const { data: links } = useQuery<{ tag_id: string }>(
    'SELECT tag_id FROM transaction_tags WHERE transaction_id = ?',
    [key]
  );
  return { tx: rows[0] ?? null, splits, tagIds: links.map((l) => l.tag_id) };
}

export interface BuiltQuery {
  sql: string;
  params: (string | number | null)[];
}

/**
 * Query builder behind useTransactions (exported so the exact SQL + params
 * can run against a real SQLite in tests — placeholder mismatches throw).
 */
export function buildTransactionsQuery(
  householdId: string | null,
  f: TransactionFilters,
  limit: number,
  offset: number,
  displayBase: string
): BuiltQuery {
  const clauses = ['t.household_id = ?'];
  const params: (string | number)[] = [householdId ?? ''];
  const search = f.search.trim();
  if (search) {
    clauses.push('t.note LIKE ?');
    params.push(`%${search}%`);
  }
  if (f.kind) {
    clauses.push('t.kind = ?');
    params.push(f.kind);
  }
  if (f.categoryId) {
    clauses.push('t.category_id = ?');
    params.push(f.categoryId);
  }
  if (f.accountId) {
    clauses.push('(t.account_id = ? OR t.to_account_id = ?)');
    params.push(f.accountId, f.accountId);
  }
  if (f.tagId) {
    clauses.push(
      'EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = t.id AND tt.tag_id = ?)'
    );
    params.push(f.tagId);
  }
  if (f.from) {
    clauses.push('t.txn_date >= ?');
    params.push(f.from);
  }
  if (f.to) {
    clauses.push('t.txn_date <= ?');
    params.push(f.to);
  }
  const orderBy =
    f.sort === 'oldest'
      ? 'ORDER BY t.txn_date ASC, t.created_at ASC'
      : f.sort === 'amount'
        ? 'ORDER BY t.amount DESC, t.txn_date DESC'
        : 'ORDER BY t.txn_date DESC, t.created_at DESC';
  const sql = `SELECT t.*, a.name AS account_name, d.name AS to_account_name,
      c.key AS category_key, c.label AS category_label,
      ${txnDisplaySQL('t', displayBase)} AS display_amount
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN accounts d ON d.id = t.to_account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${clauses.join(' AND ')}
    ${orderBy} LIMIT ? OFFSET ?`;
  return { sql, params: [...params, limit, offset] };
}

export function useTransactions(
  householdId: string | null,
  f: TransactionFilters,
  limit: number,
  offset: number,
  displayBase: string
): TransactionView[] {
  const { sql, params } = buildTransactionsQuery(householdId, f, limit, offset, displayBase);
  const { data } = useQuery<TransactionView>(sql, params);
  return data;
}
