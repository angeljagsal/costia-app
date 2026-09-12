/**
 * Display-currency SQL. History stays frozen per row (base_amount +
 * base_currency + txn_date); every read converts to the *current* base:
 * frozen value when it matches, exact original when that matches, else the
 * cached rate on/before the row date, else the frozen fallback. Mirrors the
 * pure `displayAmount` in `src/lib/fx.ts` (unit-tested there).
 *
 * Each builder returns a CASE expression with `?` placeholders; append the
 * documented params in order alongside the rest of the query params.
 */

/**
 * Validated base-currency literal for embedding in SQL. The display base comes
 * from our own prefs (MXN|USD only); anything else throws instead of reaching
 * SQL. Embedding (rather than `?` params) keeps placeholder order identical
 * to param order — a previous revision used `?` here and every query silently
 * bound its params to the wrong slots (SELECT precedes WHERE textually).
 */
export function baseLiteral(base: string): string {
  if (base !== 'MXN' && base !== 'USD') throw new Error(`Unsupported base currency: ${base}`);
  return `'${base}'`;
}

/** Transaction row (alias) -> current base. Adds no params. */
export function txnDisplaySQL(alias: string, base: string): string {
  const b = baseLiteral(base);
  return `COALESCE(
    CASE WHEN ${alias}.base_currency IS NULL OR ${alias}.base_currency = ${b} THEN ${alias}.base_amount
         WHEN ${alias}.currency = ${b} THEN ${alias}.amount
         ELSE ${alias}.amount * (
           SELECT r.rate FROM exchange_rates r
           WHERE r.base_currency = ${alias}.currency AND r.target_currency = ${b}
             AND r.rate_date <= ${alias}.txn_date
           ORDER BY r.rate_date DESC LIMIT 1)
    END, ${alias}.base_amount)`;
}

/**
 * Account opening (alias) -> current base, sign-preserving (credit debt stays
 * negative; callers take abs for "owed" display). Adds no params.
 */
export function openingDisplaySQL(alias: string, base: string): string {
  const b = baseLiteral(base);
  return `COALESCE(
    CASE WHEN ${alias}.opening_amount IS NULL OR ${alias}.opening_amount = 0 THEN 0
         WHEN ${alias}.opening_currency = ${b} THEN (
           CASE WHEN ${alias}.opening_base < 0 THEN -${alias}.opening_amount
                ELSE ${alias}.opening_amount END)
         ELSE (CASE WHEN ${alias}.opening_base < 0 THEN -1 ELSE 1 END)
              * ${alias}.opening_amount * (
           SELECT r.rate FROM exchange_rates r
           WHERE r.base_currency = ${alias}.opening_currency AND r.target_currency = ${b}
             AND r.rate_date <= ${alias}.opening_date
           ORDER BY r.rate_date DESC LIMIT 1)
    END, ${alias}.opening_base)`;
}
