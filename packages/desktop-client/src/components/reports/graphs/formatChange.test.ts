import { describe, expect, it } from 'vitest';

import { formatChange } from './formatChange';

const format = (value: unknown) => Number(value).toFixed(2);

describe('formatChange', () => {
  it('adds a plus sign to a rise', () => {
    expect(formatChange(12.5, format, 'totalAssets')).toBe('+12.50');
    expect(formatChange(-12.5, format, 'totalAssets')).toBe('-12.50');
  });

  it('shows more spending as a rise, since spending is stored as negative', () => {
    expect(formatChange(-12.5, format, 'totalDebts')).toBe('+12.50');
    expect(formatChange(12.5, format, 'netDebts')).toBe('-12.50');
  });

  it('leaves no change unsigned', () => {
    expect(formatChange(0, format, 'totalDebts')).toBe('0.00');
  });
});
