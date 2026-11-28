import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFormat } from './useFormat';

const prefs = vi.hoisted(() => ({ currencyFlag: 'true' }));

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    name === 'defaultCurrencyCode'
      ? 'JPY'
      : name === 'flags.currency'
        ? prefs.currencyFlag
        : undefined,
    vi.fn(),
  ],
}));

describe('useFormat', () => {
  beforeEach(() => {
    prefs.currencyFlag = 'true';
  });

  it('reads and shows amounts ×100 in a currency without decimals', () => {
    const format = renderHook(() => useFormat()).result.current;

    expect(format(150000, 'financial')).toBe('‪¥‬1,500');
    expect(format.forEdit(150000)).toBe('1,500');
    expect(format.fromEdit('1500')).toBe(150000);
    expect(format.fromEdit(format.forEdit(150050))).toBe(150050);
  });

  it('shows no symbol for a saved currency while Currency support is off', () => {
    prefs.currencyFlag = 'false';
    const format = renderHook(() => useFormat()).result.current;

    expect(format(150000, 'financial')).toBe('1,500');
  });
});
