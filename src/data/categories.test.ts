import { describe, expect, it } from 'vitest';
import { categoryName } from './categories';

const t = (key: string) => (key === 'categories.food_dining' ? 'Food & Dining' : key);

describe('categoryName', () => {
  it('prefers a custom label, trimmed', () => {
    expect(categoryName(t, { key: 'food_dining', label: '  My spots  ' })).toBe('My spots');
  });
  it('resolves catalog keys through the dictionary', () => {
    expect(categoryName(t, { key: 'food_dining', label: null })).toBe('Food & Dining');
  });
  it('humanizes unknown keys instead of leaking key paths', () => {
    expect(categoryName(t, { key: 'other_expense', label: null })).toBe('other expense');
  });
  it('falls back to ? when nameless', () => {
    expect(categoryName(t, { key: null, label: null })).toBe('?');
  });
});
