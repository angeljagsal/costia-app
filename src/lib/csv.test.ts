import { describe, expect, it } from 'vitest';
import type { TransactionView } from '../data/types';
import { buildCsv } from './csv';

const t = (key: string) => key;

function row(overrides: Partial<TransactionView> = {}): TransactionView {
  return {
    id: 'tx-1',
    household_id: 'hh',
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-1',
    amount: 100,
    currency: 'MXN',
    base_amount: 100,
    base_currency: 'MXN',
    fx_rate: 1,
    txn_date: '2026-09-10',
    kind: 'expense',
    note: 'groceries',
    recurring_rule_id: null,
    created_at: '2026-09-10T00:00:00.000Z',
    account_name: 'Cash',
    to_account_name: null,
    category_key: null,
    category_label: 'Food',
    display_amount: 100,
    ...overrides,
  };
}

describe('buildCsv', () => {
  it('emits a header plus one line per row', () => {
    const csv = buildCsv(t, [row()], 'MXN');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'date,kind,account,to_account,category,amount,currency,display_amount,display_currency,note'
    );
    expect(lines[1]).toContain('2026-09-10,expense,Cash,,Food,100,MXN,100,MXN,groceries');
  });
  it('leaves category empty for transfers and fills both accounts', () => {
    const csv = buildCsv(
      t,
      [row({ kind: 'transfer', account_name: 'Bank', to_account_name: 'Cash' })],
      'MXN'
    );
    expect(csv.split('\n')[1]).toContain('transfer,Bank,Cash,,100');
  });
  it('quotes cells with commas, quotes, or newlines', () => {
    const csv = buildCsv(t, [row({ note: 'dinner, "fancy"\nplace' })], 'MXN');
    expect(csv).toContain('"dinner, ""fancy""\nplace"');
  });
});
