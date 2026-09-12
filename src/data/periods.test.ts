import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  getPeriodRange,
  monthEnd,
  monthRange,
  monthStart,
  shiftMonth,
  todayLocal,
  toISODate,
} from './periods';

describe('toISODate / todayLocal', () => {
  it('formats local parts without UTC shifting', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toISODate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });
  it('todayLocal looks like a date', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDaysISO', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('respects leap years', () => {
    expect(addDaysISO('2024-03-01', -1)).toBe('2024-02-29');
  });
});

describe('getPeriodRange', () => {
  it('covers full calendar months incl. February lengths', () => {
    expect(getPeriodRange('monthly', '2026-02-15')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(getPeriodRange('monthly', '2024-02-10')).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
    expect(getPeriodRange('monthly', '2026-01-20')).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });
  it('covers calendar years', () => {
    expect(getPeriodRange('yearly', '2026-07-04')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });
  it('starts weeks on Monday', () => {
    // 2026-09-13 is a Sunday, 2026-09-07 the Monday before it.
    expect(getPeriodRange('weekly', '2026-09-13')).toEqual({
      from: '2026-09-07',
      to: '2026-09-13',
    });
    expect(getPeriodRange('weekly', '2026-09-07')).toEqual({
      from: '2026-09-07',
      to: '2026-09-13',
    });
    expect(getPeriodRange('weekly', '2026-09-09')).toEqual({
      from: '2026-09-07',
      to: '2026-09-13',
    });
  });
  it('lets weeks cross month and year boundaries', () => {
    expect(getPeriodRange('weekly', '2026-09-01')).toEqual({
      from: '2026-08-31',
      to: '2026-09-06',
    });
    expect(getPeriodRange('weekly', '2026-01-01')).toEqual({
      from: '2025-12-29',
      to: '2026-01-04',
    });
  });
});

describe('month helpers', () => {
  it('lists inclusive month ranges', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(monthRange('2026-05', '2026-05')).toEqual(['2026-05']);
  });
  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-06', 0)).toBe('2026-06');
  });
  it('bounds months incl. leap February', () => {
    expect(monthStart('2026-09')).toBe('2026-09-01');
    expect(monthEnd('2026-09')).toBe('2026-09-30');
    expect(monthEnd('2024-02')).toBe('2024-02-29');
    expect(monthEnd('2026-02')).toBe('2026-02-28');
  });
});
