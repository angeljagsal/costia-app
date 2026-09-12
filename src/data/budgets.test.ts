import { describe, expect, it } from 'vitest';
import { budgetBarColor, budgetStateFor } from './budgets';

describe('budgetStateFor', () => {
  it('is on track below 80%', () => {
    expect(budgetStateFor(0, 100)).toBe('onTrack');
    expect(budgetStateFor(79.99, 100)).toBe('onTrack');
  });
  it('warns at exactly 80% up to (not incl.) 100%', () => {
    expect(budgetStateFor(80, 100)).toBe('nearLimit');
    expect(budgetStateFor(99.99, 100)).toBe('nearLimit');
  });
  it('flags 100% and beyond as over', () => {
    expect(budgetStateFor(100, 100)).toBe('overLimit');
    expect(budgetStateFor(150, 100)).toBe('overLimit');
  });
  it('treats a zero limit as on track (nothing to compare)', () => {
    expect(budgetStateFor(0, 0)).toBe('onTrack');
    expect(budgetStateFor(10, 0)).toBe('onTrack');
  });
});

describe('budgetBarColor', () => {
  it('maps states to theme variables', () => {
    expect(budgetBarColor('onTrack')).toBe('var(--success)');
    expect(budgetBarColor('nearLimit')).toBe('#e8930c');
    expect(budgetBarColor('overLimit')).toBe('var(--danger)');
  });
});
