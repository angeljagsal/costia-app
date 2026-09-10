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

export async function toBaseAmount(
  amount: number,
  currency: string,
  baseCurrency: string,
  txnDate: string
): Promise<number> {
  const rate = await getRate(currency, baseCurrency, txnDate);
  if (rate === null) throw new Error(`No FX rate ${currency} -> ${baseCurrency}`);
  return amount * rate;
}
