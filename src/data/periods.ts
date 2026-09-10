import type { BudgetPeriod } from './types';

export interface DateRange {
  /** YYYY-MM-DD, inclusive */
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayLocal(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Inclusive YYYY-MM list from fromMonth to toMonth. */
export function monthRange(fromMonth: string, toMonth: string): string[] {
  const out: string[] = [];
  let [y, m] = fromMonth.split('-').map(Number);
  const [ey, em] = toMonth.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Calendar month / calendar year / Monday-start week containing refISO. */
export function getPeriodRange(period: BudgetPeriod, refISO: string): DateRange {
  const d = new Date(`${refISO}T00:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (period === 'monthly') {
    return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) };
  }
  if (period === 'yearly') {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const mondayOffset = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toISODate(monday), to: toISODate(sunday) };
}
