import { categoryName } from '../data/categories';
import type { TransactionView } from '../data/types';

function cell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Client-side CSV of transaction rows for export/download. Amounts keep their
 * original currency; display_amount carries the converted value in baseCurrency.
 * Pure — unit-tested.
 */
export function buildCsv(
  t: (key: string) => string,
  rows: TransactionView[],
  baseCurrency: string
): string {
  const header = [
    'date',
    'kind',
    'account',
    'to_account',
    'category',
    'amount',
    'currency',
    'display_amount',
    'display_currency',
    'note',
  ];
  const lines = rows.map((r) =>
    [
      r.txn_date,
      r.kind,
      r.account_name,
      r.to_account_name ?? '',
      r.kind === 'transfer'
        ? ''
        : categoryName(t, { key: r.category_key, label: r.category_label }),
      r.amount,
      r.currency,
      Math.round(r.display_amount * 100) / 100,
      baseCurrency,
      r.note ?? '',
    ]
      .map(cell)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
