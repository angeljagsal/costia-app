import { describe, expect, it } from 'vitest';
import { displayAmount } from './fx';
import type { DisplayRow } from './fx';
import { toBaseAmount } from './fx';

describe('toBaseAmount', () => {
  it('needs no rate for same-currency conversion', async () => {
    await expect(toBaseAmount(250.5, 'MXN', 'MXN', '2026-09-10')).resolves.toEqual({
      base: 250.5,
      rate: 1,
    });
    await expect(toBaseAmount(10, 'USD', 'USD', '2026-09-10')).resolves.toEqual({
      base: 10,
      rate: 1,
    });
  });
  it('throws instead of guessing when no rate is cached', async () => {
    await expect(toBaseAmount(10, 'USD', 'MXN', '2026-09-10')).rejects.toThrow(/No FX rate/);
  });
  it('accepts a manual override without touching the rate cache', async () => {
    await expect(toBaseAmount(10, 'USD', 'MXN', '2026-09-10', 17.5)).resolves.toEqual({
      base: 175,
      rate: 17.5,
    });
  });
  it('rejects a non-positive override', async () => {
    await expect(toBaseAmount(10, 'USD', 'MXN', '2026-09-10', 0)).rejects.toThrow(/No FX rate/);
  });
});

describe('displayAmount', () => {
  function row(overrides: Partial<DisplayRow> = {}): DisplayRow {
    return {
      amount: 100,
      currency: 'USD',
      base_amount: 1750,
      base_currency: 'MXN',
      txn_date: '2026-09-10',
      ...overrides,
    };
  }

  it('returns the frozen base when it already matches', () => {
    expect(displayAmount(row(), 'MXN', 99)).toBe(1750);
  });
  it('returns the exact original amount when that matches', () => {
    expect(displayAmount(row(), 'USD', null)).toBe(100);
  });
  it('converts with the live rate otherwise', () => {
    expect(displayAmount(row({ base_currency: 'USD' }), 'MXN', 17.5)).toBe(1750);
    expect(
      displayAmount(row({ amount: 100, currency: 'MXN', base_currency: 'MXN' }), 'USD', 0.06)
    ).toBe(6);
  });
  it('falls back to the frozen base when no rate exists', () => {
    expect(displayAmount(row(), 'EUR', null)).toBe(1750);
  });
  it('treats legacy rows without base_currency as frozen', () => {
    expect(displayAmount(row({ base_currency: null }), 'USD', 17.5)).toBe(1750);
  });
});
