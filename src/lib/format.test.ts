import { describe, expect, it } from 'vitest';
import { formatMoney, formatMonthLabel, parseAmount } from './format';

describe('parseAmount', () => {
  it('parses plain decimals', () => {
    expect(parseAmount('1234.56')).toBe(1234.56);
    expect(parseAmount('  42  ')).toBe(42);
  });
  it('accepts decimal commas (es-MX typing)', () => {
    expect(parseAmount('1234,56')).toBe(1234.56);
  });
  it('strips thousands separators', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1,234,567.89')).toBe(1234567.89);
  });
  it('rejects empty and garbage input', () => {
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('   ')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
  });
});

describe('formatMoney', () => {
  it('formats real currencies per locale', () => {
    expect(formatMoney('en', 1234.5, 'USD')).toContain('1,234.50');
    expect(formatMoney('es-MX', 1234.5, 'MXN')).toContain('1,234.50');
  });
  it('renders unknown currency codes without crashing', () => {
    // ICU accepts any 3-letter code; the try/catch is only for truly invalid input.
    const out = formatMoney('en', 10, 'ZZZ');
    expect(out).toContain('ZZZ');
    expect(out).toContain('10.00');
  });
});

describe('formatMonthLabel', () => {
  it('abbreviates months per locale', () => {
    expect(formatMonthLabel('en', '2026-09')).toContain('Sep');
    expect(formatMonthLabel('en', '2026-09')).toContain('26');
  });
  it('returns the input when unparseable', () => {
    expect(formatMonthLabel('en', 'not-a-month')).toBe('not-a-month');
  });
});
