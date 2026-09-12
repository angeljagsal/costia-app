import { describe, expect, it } from 'vitest';
import { toBaseAmount } from './fx';

describe('toBaseAmount', () => {
  it('needs no rate for same-currency conversion', async () => {
    await expect(toBaseAmount(250.5, 'MXN', 'MXN', '2026-09-10')).resolves.toBe(250.5);
    await expect(toBaseAmount(10, 'USD', 'USD', '2026-09-10')).resolves.toBe(10);
  });
  it('throws instead of guessing when no rate is cached', async () => {
    await expect(toBaseAmount(10, 'USD', 'MXN', '2026-09-10')).rejects.toThrow(/No FX rate/);
  });
});
