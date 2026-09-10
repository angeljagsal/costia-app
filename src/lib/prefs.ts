export type BaseCurrency = 'MXN' | 'USD';

const CURRENCY_KEY = 'costia:baseCurrency';

/** Local-only until Phase 2 moves this onto users.base_currency. */
export function loadBaseCurrency(): BaseCurrency {
  try {
    return localStorage.getItem(CURRENCY_KEY) === 'USD' ? 'USD' : 'MXN';
  } catch {
    return 'MXN';
  }
}

export function saveBaseCurrency(c: BaseCurrency): void {
  try {
    localStorage.setItem(CURRENCY_KEY, c);
  } catch {
    // ignore persistence failures
  }
}
