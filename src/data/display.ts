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

/** Params for one txnDisplaySQL use, in order. Spread once per use. */
export function txnDisplayParams(base: string): [string, string, string] {
  return [base, base, base];
}

/** Params for one openingDisplaySQL use, in order. Spread once per use. */
export function openingDisplayParams(base: string): [string, string] {
  return [base, base];
}

/** Transaction row (alias) -> current base. Appends 3 params: [base, base, base]. */
export function txnDisplaySQL(alias = 't'): string {
  return `COALESCE(
    CASE WHEN ${alias}.base_currency IS NULL OR ${alias}.base_currency = ? THEN ${alias}.base_amount
         WHEN ${alias}.currency = ? THEN ${alias}.amount
         ELSE ${alias}.amount * (
           SELECT r.rate FROM exchange_rates r
           WHERE r.base_currency = ${alias}.currency AND r.target_currency = ?
             AND r.rate_date <= ${alias}.txn_date
           ORDER BY r.rate_date DESC LIMIT 1)
    END, ${alias}.base_amount)`;
}

/**
 * Account opening (alias) -> current base, sign-preserving (credit debt stays
 * negative; callers take abs for "owed" display). Appends 2 params: [base, base].
 */
export function openingDisplaySQL(alias = 'a'): string {
  return `COALESCE(
    CASE WHEN ${alias}.opening_amount IS NULL OR ${alias}.opening_amount = 0 THEN 0
         WHEN ${alias}.opening_currency = ? THEN (
           CASE WHEN ${alias}.opening_base < 0 THEN -${alias}.opening_amount
                ELSE ${alias}.opening_amount END)
         ELSE (CASE WHEN ${alias}.opening_base < 0 THEN -1 ELSE 1 END)
              * ${alias}.opening_amount * (
           SELECT r.rate FROM exchange_rates r
           WHERE r.base_currency = ${alias}.opening_currency AND r.target_currency = ?
             AND r.rate_date <= ${alias}.opening_date
           ORDER BY r.rate_date DESC LIMIT 1)
    END, ${alias}.opening_base)`;
}
