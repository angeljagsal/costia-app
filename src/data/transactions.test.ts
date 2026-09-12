import { describe, expect, it } from 'vitest';
import type { AppDatabase } from '../powersync/db';
import { createTransaction, resolveSplits } from './transactions';
import type { TransactionInput } from './types';

const db = {} as AppDatabase; // validation throws before touching the db

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amount: 100,
    currency: 'MXN',
    kind: 'expense',
    txnDate: '2026-09-10',
    ...overrides,
  };
}

describe('resolveSplits', () => {
  it('persists a single whole-amount row when not split', () => {
    expect(resolveSplits(input())).toEqual([{ categoryId: 'cat-1', amount: 100 }]);
    expect(resolveSplits(input({ splits: [] }))).toEqual([{ categoryId: 'cat-1', amount: 100 }]);
  });
  it('ignores empty split rows', () => {
    expect(resolveSplits(input({ splits: [{ categoryId: '', amount: 0 }] }))).toEqual([
      { categoryId: 'cat-1', amount: 100 },
    ]);
  });
  it('keeps balanced splits as-is', () => {
    const splits = [
      { categoryId: 'cat-1', amount: 60 },
      { categoryId: 'cat-2', amount: 40 },
    ];
    expect(resolveSplits(input({ splits }))).toEqual(splits);
  });
  it('accepts cent-exact splits (3.33 + 3.33 + 3.34 = 10)', () => {
    const splits = [
      { categoryId: 'cat-1', amount: 3.33 },
      { categoryId: 'cat-2', amount: 3.33 },
      { categoryId: 'cat-3', amount: 3.34 },
    ];
    expect(resolveSplits(input({ amount: 10, splits }))).toEqual(splits);
  });
  it('rejects imbalanced splits', () => {
    expect(() => resolveSplits(input({ splits: [{ categoryId: 'cat-1', amount: 60 }] }))).toThrow(
      'tx.errSplitMismatch'
    );
  });
});

describe('createTransaction validation', () => {
  it('requires account, category, and date', async () => {
    await expect(createTransaction(db, 'hh', 'MXN', input({ accountId: '' }))).rejects.toThrow(
      'tx.errRequired'
    );
    await expect(createTransaction(db, 'hh', 'MXN', input({ categoryId: '' }))).rejects.toThrow(
      'tx.errRequired'
    );
    await expect(createTransaction(db, 'hh', 'MXN', input({ txnDate: '' }))).rejects.toThrow(
      'tx.errRequired'
    );
  });
  it('requires a positive amount', async () => {
    await expect(createTransaction(db, 'hh', 'MXN', input({ amount: 0 }))).rejects.toThrow(
      'tx.errAmount'
    );
    await expect(createTransaction(db, 'hh', 'MXN', input({ amount: -5 }))).rejects.toThrow(
      'tx.errAmount'
    );
  });
  it('rejects imbalanced splits before touching FX', async () => {
    await expect(
      createTransaction(db, 'hh', 'MXN', input({ splits: [{ categoryId: 'cat-1', amount: 1 }] }))
    ).rejects.toThrow('tx.errSplitMismatch');
  });
  it('refuses to guess when no FX rate exists', async () => {
    // Empty store: getRate finds nothing, so the save must block.
    await expect(
      createTransaction(db, 'hh', 'MXN', input({ amount: 10, currency: 'USD' }))
    ).rejects.toThrow('tx.errNoFxRate');
  });
});

describe('transfers', () => {
  function transfer(overrides: Partial<TransactionInput> = {}): TransactionInput {
    return input({
      kind: 'transfer',
      categoryId: undefined,
      accountId: 'acc-1',
      toAccountId: 'acc-2',
      ...overrides,
    });
  }

  it('persists no splits for transfers', () => {
    expect(resolveSplits(transfer())).toEqual([]);
  });

  it('requires two different accounts', async () => {
    await expect(
      createTransaction(db, 'hh', 'MXN', transfer({ toAccountId: undefined }))
    ).rejects.toThrow('tx.errTransferAccounts');
    await expect(
      createTransaction(db, 'hh', 'MXN', transfer({ toAccountId: 'acc-1' }))
    ).rejects.toThrow('tx.errTransferSame');
  });

  it('rejects categories, splits, and tags on transfers', async () => {
    await expect(
      createTransaction(db, 'hh', 'MXN', transfer({ categoryId: 'cat-1' }))
    ).rejects.toThrow('tx.errTransferNoCategory');
    await expect(
      createTransaction(
        db,
        'hh',
        'MXN',
        transfer({ splits: [{ categoryId: 'cat-1', amount: 100 }] })
      )
    ).rejects.toThrow('tx.errTransferNoCategory');
    await expect(
      createTransaction(db, 'hh', 'MXN', transfer({ tagIds: ['tag-1'] }))
    ).rejects.toThrow('tx.errTransferNoCategory');
  });
});
