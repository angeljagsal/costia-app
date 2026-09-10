/** Locale-aware display helpers shared by dashboard, reports, and lists. */

export function localeTag(locale: string): string {
  return locale === 'es-MX' ? 'es-MX' : 'en-US';
}

export function formatMoney(locale: string, amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(localeTag(locale), { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDay(locale: string, iso: string): string {
  try {
    return new Intl.DateTimeFormat(localeTag(locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}

export function formatMonthLabel(locale: string, yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(localeTag(locale), { month: 'short', year: '2-digit' }).format(
      new Date(y, m - 1, 1)
    );
  } catch {
    return yyyyMM;
  }
}
