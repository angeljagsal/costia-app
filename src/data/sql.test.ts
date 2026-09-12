/**
 * Integration over the real query builders: every hook SQL runs against a
 * seeded in-memory SQLite. A placeholder/param mismatch throws, and the
 * assertions pin display conversion, transfers, openings, splits, and sort.
 */
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { buildAccountBalancesQuery } from './accounts';
import { buildBudgetSpentQuery } from './budgets';
import {
  buildAccountPeriodNetQuery,
  buildBalanceHistoryQuery,
  buildBalanceSeedQuery,
  buildCategoryTotalsQuery,
  buildMonthlyFlowQuery,
} from './reports';
import { buildTransactionsQuery } from './transactions';
import { EMPTY_FILTERS } from './types';
import type { TransactionFilters } from './types';

const DDL = `
CREATE TABLE accounts (id TEXT PRIMARY KEY, household_id TEXT, name TEXT, type TEXT,
  opening_base REAL, opening_amount REAL, opening_currency TEXT, opening_date TEXT, created_at TEXT);
CREATE TABLE categories (id TEXT PRIMARY KEY, key TEXT, kind TEXT, sort INTEGER,
  household_id TEXT, label TEXT);
CREATE TABLE transactions (id TEXT PRIMARY KEY, household_id TEXT, account_id TEXT,
  to_account_id TEXT, category_id TEXT, amount REAL, currency TEXT, base_amount REAL,
  base_currency TEXT, fx_rate REAL, txn_date TEXT, kind TEXT, note TEXT,
  recurring_rule_id TEXT, created_at TEXT);
CREATE TABLE transaction_splits (id TEXT PRIMARY KEY, transaction_id TEXT, category_id TEXT, amount REAL);
CREATE TABLE exchange_rates (id TEXT PRIMARY KEY, base_currency TEXT, target_currency TEXT,
  rate REAL, rate_date TEXT, fetched_at TEXT);
`;

function seed(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(DDL);
  const run = (sql: string, ...params: (string | number | null)[]) =>
    db.prepare(sql).run(...params);
  run(
    `INSERT INTO accounts VALUES (?, 'hh', 'Bank', 'bank', 5000, 5000, 'MXN', '2026-09-01', '')`,
    'acc-bank'
  );
  run(`INSERT INTO accounts VALUES (?, 'hh', 'Cash', 'cash', 0, 0, 'MXN', NULL, '')`, 'acc-cash');
  run(
    `INSERT INTO accounts VALUES (?, 'hh', 'Card', 'credit', -2000, 2000, 'MXN', '2026-09-01', '')`,
    'acc-card'
  );
  run(`INSERT INTO categories VALUES ('cat-food', NULL, 'expense', 0, NULL, 'Food')`);
  run(`INSERT INTO categories VALUES ('cat-tr', NULL, 'expense', 1, NULL, 'Transport')`);
  run(`INSERT INTO categories VALUES ('cat-sal', NULL, 'income', 0, NULL, 'Salary')`);
  const tx = (
    id: string,
    account: string,
    to: string | null,
    cat: string | null,
    amount: number,
    currency: string,
    base: number,
    baseCur: string,
    rate: number,
    date: string,
    kind: string,
    created = ''
  ) =>
    run(
      `INSERT INTO transactions VALUES (?, 'hh', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      id,
      account,
      to,
      cat,
      amount,
      currency,
      base,
      baseCur,
      rate,
      date,
      kind,
      created
    );
  tx('t1', 'acc-bank', null, 'cat-food', 100, 'MXN', 100, 'MXN', 1, '2026-09-10', 'expense', 'a');
  tx('t2', 'acc-bank', null, 'cat-food', 10, 'USD', 175, 'MXN', 17.5, '2026-09-11', 'expense', 'b');
  tx('t3', 'acc-bank', null, 'cat-sal', 1000, 'MXN', 1000, 'MXN', 1, '2026-09-11', 'income', 'c');
  tx('t4', 'acc-bank', 'acc-cash', null, 500, 'MXN', 500, 'MXN', 1, '2026-09-12', 'transfer', 'd');
  tx('t5', 'acc-cash', null, 'cat-food', 100, 'MXN', 100, 'MXN', 1, '2026-09-12', 'expense', 'e');
  run(`INSERT INTO transaction_splits VALUES ('s1', 't5', 'cat-food', 60)`);
  run(`INSERT INTO transaction_splits VALUES ('s2', 't5', 'cat-tr', 40)`);
  // Single-category transactions still persist one whole-amount split row.
  run(`INSERT INTO transaction_splits VALUES ('s3', 't1', 'cat-food', 100)`);
  run(`INSERT INTO transaction_splits VALUES ('s4', 't2', 'cat-food', 10)`);
  run(`INSERT INTO exchange_rates VALUES ('r1', 'USD', 'MXN', 17.5, '2026-09-01', '')`);
  run(`INSERT INTO exchange_rates VALUES ('r2', 'MXN', 'USD', 0.057, '2026-09-01', '')`);
  return db;
}

function all(
  db: DatabaseSync,
  sql: string,
  params: (string | number | null)[]
): Record<string, number | string | null>[] {
  return db.prepare(sql).all(...params) as Record<string, number | string | null>[];
}

describe('placeholder discipline', () => {
  // SQLite binds positionally in textual order. Every builder must expose
  // exactly one param per `?` — a previous revision bound display params
  // after filter params while the display SQL sits first textually,
  // silently emptying every list. This pins the invariant.
  it('matches placeholder counts to param counts', () => {
    const from = '2026-09-01';
    const to = '2026-09-30';
    const filters: TransactionFilters[] = [
      EMPTY_FILTERS,
      { ...EMPTY_FILTERS, search: 'x', kind: 'expense', categoryId: 'c', accountId: 'a' },
      { ...EMPTY_FILTERS, tagId: 'g', from, to, sort: 'amount' },
    ];
    const queries = [
      ...filters.flatMap((f) => [
        buildTransactionsQuery('hh', f, 50, 0, 'MXN'),
        buildTransactionsQuery('hh', f, 50, 0, 'USD'),
      ]),
      buildAccountBalancesQuery('hh', 'MXN'),
      buildAccountBalancesQuery(null, 'USD'),
      buildCategoryTotalsQuery('hh', 'expense', from, to, 'MXN'),
      buildMonthlyFlowQuery('hh', from, to, 'USD'),
      buildAccountPeriodNetQuery('hh', from, to, 'MXN'),
      buildBalanceHistoryQuery('hh', '2026-09', 'MXN'),
      buildBalanceSeedQuery('hh', '2026-09', 'USD'),
      buildBudgetSpentQuery('hh', 'cat-food', from, to, 'MXN'),
    ];
    for (const q of queries) {
      const marks = (q.sql.match(/\?/g) ?? []).length;
      expect(marks, q.sql.slice(0, 80)).toBe(q.params.length);
    }
  });
});

describe('hook SQL against seeded SQLite', () => {
  it('lists transactions with converted display amounts, newest first', () => {
    const db = seed();
    const { sql, params } = buildTransactionsQuery('hh', EMPTY_FILTERS, 50, 0, 'MXN');
    const rows = all(db, sql, params);
    expect(rows).toHaveLength(5);
    expect(rows[0].id).toBe('t5');
    const t2 = rows.find((r) => r.id === 't2');
    expect(t2?.display_amount).toBeCloseTo(175, 6);
    expect(rows.find((r) => r.id === 't4')?.to_account_name).toBe('Cash');
  });

  it('converts display amounts when the base differs', () => {
    const db = seed();
    const { sql, params } = buildTransactionsQuery('hh', EMPTY_FILTERS, 50, 0, 'USD');
    const rows = all(db, sql, params);
    // t1: 100 MXN * 0.057 via cached rate; t2: original USD amount, exact.
    expect(rows.find((r) => r.id === 't1')?.display_amount).toBeCloseTo(5.7, 6);
    expect(rows.find((r) => r.id === 't2')?.display_amount).toBeCloseTo(10, 6);
  });

  it('balances include openings and transfer legs', () => {
    const db = seed();
    const { sql, params } = buildAccountBalancesQuery('hh', 'MXN');
    const rows = all(db, sql, params);
    const bal = (id: string) => rows.find((r) => r.account_id === id)?.balance;
    expect(bal('acc-bank')).toBeCloseTo(5000 - 100 - 175 + 1000 - 500, 6);
    expect(bal('acc-cash')).toBeCloseTo(500 - 100, 6);
    expect(bal('acc-card')).toBeCloseTo(-2000, 6);
  });

  it('reports split-proportional, transfer-excluding totals', () => {
    const db = seed();
    const from = '2026-09-01';
    const to = '2026-09-30';
    const cat = buildCategoryTotalsQuery('hh', 'expense', from, to, 'MXN');
    const totals = all(db, cat.sql, cat.params);
    // food: t1 100 + t2 175 (USD→MXN) + t5 split 60; transport: t5 split 40.
    expect(totals.find((r) => r.label === 'Food')?.total).toBeCloseTo(335, 6);
    expect(totals.find((r) => r.label === 'Transport')?.total).toBeCloseTo(40, 6);

    const flow = buildMonthlyFlowQuery('hh', from, to, 'MXN');
    const months = all(db, flow.sql, flow.params);
    expect(months).toHaveLength(1);
    expect(months[0].income).toBeCloseTo(1000, 6);
    expect(months[0].expenses).toBeCloseTo(375, 6);

    const spent = buildBudgetSpentQuery('hh', 'cat-food', from, to, 'MXN');
    expect(all(db, spent.sql, spent.params)[0].spent).toBeCloseTo(335, 6);

    const net = buildAccountPeriodNetQuery('hh', from, to, 'MXN');
    const nets = all(db, net.sql, net.params);
    const n = (id: string) => nets.find((r) => r.account_id === id)?.net;
    expect(n('acc-bank')).toBeCloseTo(-100 - 175 + 1000 - 500, 6);
    expect(n('acc-cash')).toBeCloseTo(500 - 100, 6);
  });

  it('seeds balance history with converted openings', () => {
    const db = seed();
    const seedQ = buildBalanceSeedQuery('hh', '2026-09', 'MXN');
    expect(all(db, seedQ.sql, seedQ.params)[0].seed).toBeCloseTo(3000, 6);
    const hist = buildBalanceHistoryQuery('hh', '2026-09', 'MXN');
    const months = all(db, hist.sql, hist.params);
    expect(months).toHaveLength(1);
    expect(months[0].net).toBeCloseTo(-100 - 175 - 100 + 1000, 6);
  });

  it('sorts oldest-first and by amount on request', () => {
    const db = seed();
    const oldest = buildTransactionsQuery('hh', { ...EMPTY_FILTERS, sort: 'oldest' }, 50, 0, 'MXN');
    expect(all(db, oldest.sql, oldest.params)[0].id).toBe('t1');
    const biggest = buildTransactionsQuery(
      'hh',
      { ...EMPTY_FILTERS, sort: 'amount' },
      50,
      0,
      'MXN'
    );
    const rows = all(db, biggest.sql, biggest.params);
    expect(rows[0].id).toBe('t3');
  });
});
