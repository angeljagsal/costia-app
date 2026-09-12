import { db } from '../powersync/db';

/**
 * Frozen FX conversion. Reads the cached rate on/before the transaction date
 * (latest known as fallback); same-currency is always 1 without a lookup.
 * The result is stored as transactions.base_amount and never recomputed.
 */
export async function getRate(
  from: string,
  to: string,
  onOrBefore: string
): Promise<number | null> {
  if (from === to) return 1;
  const dated = await db.getOptional<{ rate: number }>(
    `SELECT rate FROM exchange_rates
     WHERE base_currency = ? AND target_currency = ? AND rate_date <= ?
     ORDER BY rate_date DESC LIMIT 1`,
    [from, to, onOrBefore]
  );
  if (dated) return dated.rate;
  const latest = await db.getOptional<{ rate: number }>(
    `SELECT rate FROM exchange_rates
     WHERE base_currency = ? AND target_currency = ?
     ORDER BY rate_date DESC LIMIT 1`,
    [from, to]
  );
  return latest?.rate ?? null;
}

export interface FxResult {
  base: number;
  /** currency -> baseCurrency rate used (1 for same-currency or manual). */
  rate: number;
}

export async function toBaseAmount(
  amount: number,
  currency: string,
  baseCurrency: string,
  txnDate: string,
  overrideRate?: number | null
): Promise<FxResult> {
  if (overrideRate != null) {
    if (!(overrideRate > 0)) throw new Error(`No FX rate ${currency} -> ${baseCurrency}`);
    return { base: amount * overrideRate, rate: overrideRate };
  }
  const rate = await getRate(currency, baseCurrency, txnDate);
  if (rate === null) throw new Error(`No FX rate ${currency} -> ${baseCurrency}`);
  return { base: amount * rate, rate };
}

export interface DisplayRow {
  amount: number;
  currency: string;
  base_amount: number;
  base_currency: string | null;
  txn_date: string;
}

/**
 * Pure single-row display conversion. Mirrors the SQL in `src/data/display.ts`
 * (txnDisplaySQL): frozen base when it already matches, exact original amount
 * when that matches, live rate when available, else the frozen fallback.
 * Unit-tested; the SQL is verified by inspection + manual QA matrix.
 */
export function displayAmount(row: DisplayRow, currentBase: string, rate: number | null): number {
  if (!row.base_currency || row.base_currency === currentBase) return row.base_amount;
  if (row.currency === currentBase) return row.amount;
  if (rate !== null) return row.amount * rate;
  return row.base_amount;
}
