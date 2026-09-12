import { describe, expect, it } from 'vitest';
import type { AppDatabase } from '../powersync/db';
import { createRecurring, skipNextOccurrence } from './recurring';
import type { RecurringInput } from './recurring';

const db = {} as AppDatabase; // validation throws before touching the db

function input(overrides: Partial<RecurringInput> = {}): RecurringInput {
  return {
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amount: 50,
    currency: 'MXN',
    cadence: 'monthly',
    nextDue: '2026-09-12',
    ...overrides,
  };
}

describe('recurring validation', () => {
  it('rejects an end date before the next due date', async () => {
    await expect(
      createRecurring(db, 'hh', input({ nextDue: '2026-09-12', endDate: '2026-09-01' }))
    ).rejects.toThrow('recurring.errEndDate');
  });
  it('rejects skipping without a date', async () => {
    await expect(skipNextOccurrence(db, 'rule-1', '')).rejects.toThrow('recurring.errRequired');
  });
});
