import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFormat } from './useFormat';

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    name === 'defaultCurrencyCode' ? 'JPY' : undefined,
    vi.fn(),
  ],
}));

describe('useFormat', () => {
  it('reads and shows amounts ×100 in a currency without decimals', () => {
    const format = renderHook(() => useFormat()).result.current;

    expect(format(150000, 'financial')).toBe('‪¥‬1,500');
    expect(format.forEdit(150000)).toBe('1,500');
    expect(format.fromEdit('1500')).toBe(150000);
    expect(format.fromEdit(format.forEdit(150050))).toBe(150050);
  });
});
