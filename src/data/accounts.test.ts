import { describe, expect, it } from 'vitest';
import type { AppDatabase } from '../powersync/db';
import { createAccount, moveTransactions, signOpening, updateOpening } from './accounts';

const db = {} as AppDatabase; // validation throws before touching the db

describe('signOpening', () => {
  it('keeps asset openings positive', () => {
    expect(signOpening(5000, 'bank')).toBe(5000);
    expect(signOpening(5000, 'cash')).toBe(5000);
    expect(signOpening(5000, 'investment')).toBe(5000);
  });
  it('stores credit debt negative', () => {
    expect(signOpening(2000, 'credit')).toBe(-2000);
  });
  it('keeps zero at zero for every type', () => {
    expect(signOpening(0, 'bank')).toBe(0);
    expect(signOpening(0, 'credit')).toBe(0);
  });
});

describe('createAccount validation', () => {
  it('requires a name', async () => {
    await expect(createAccount(db, 'hh', '  ', 'bank', 'MXN')).rejects.toThrow('accounts.errName');
  });
  it('rejects negative or NaN openings before touching the db', async () => {
    await expect(
      createAccount(db, 'hh', 'Cash', 'cash', 'MXN', {
        amount: -5,
        currency: 'MXN',
        date: '2026-09-12',
      })
    ).rejects.toThrow('accounts.errOpening');
    await expect(
      createAccount(db, 'hh', 'Cash', 'cash', 'MXN', {
        amount: NaN,
        currency: 'MXN',
        date: '2026-09-12',
      })
    ).rejects.toThrow('accounts.errOpening');
  });
  it('requires a date for a nonzero opening', async () => {
    await expect(
      createAccount(db, 'hh', 'Cash', 'cash', 'MXN', { amount: 100, currency: 'MXN', date: '' })
    ).rejects.toThrow('accounts.errOpening');
  });
});

describe('moveTransactions validation', () => {
  it('rejects a missing or identical destination before touching the db', async () => {
    await expect(moveTransactions(db, 'acc-1', '')).rejects.toThrow('accounts.errMoveTarget');
    await expect(moveTransactions(db, 'acc-1', 'acc-1')).rejects.toThrow('accounts.errMoveTarget');
  });
});

describe('updateOpening validation', () => {
  it('rejects negative openings before touching the db', async () => {
    await expect(
      updateOpening(db, 'acc-1', 'bank', 'MXN', { amount: -1, currency: 'MXN', date: '2026-09-12' })
    ).rejects.toThrow('accounts.errOpening');
  });
});
