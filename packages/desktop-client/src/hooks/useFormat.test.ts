import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFormat } from './useFormat';

const mocks = vi.hoisted(() => ({
  prefs: {} as Record<string, string | undefined>,
}));

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mocks.prefs[name], vi.fn()],
}));

function renderFormat(prefs: Record<string, string>) {
  mocks.prefs = prefs;
  return renderHook(() => useFormat()).result.current;
}

// Stored amounts are always ×100, whatever the currency: ¥1,500 and
// $1,500.00 are both stored as 150000
describe('useFormat', () => {
  it('shows stored amounts with two decimals without a currency', () => {
    const format = renderFormat({});

    expect(format(150000, 'financial')).toBe('1,500.00');
  });

  it('shows and reads amounts in dollars', () => {
    const format = renderFormat({ defaultCurrencyCode: 'USD' });

    expect(format(150000, 'financial')).toBe('‪$‬1,500.00');
    expect(format.forEdit(150000)).toBe('1,500.00');
    expect(format.fromEdit('1500')).toBe(150000);
    expect(format.fromEdit('12.34')).toBe(1234);
  });

  it.each([
    ['decimals shown', {}],
    ['decimals hidden', { hideFraction: 'true' }],
  ])(
    'shows and reads amounts in a currency without decimals (%s)',
    (_, prefs) => {
      const format = renderFormat({ defaultCurrencyCode: 'JPY', ...prefs });

      expect(format(150000, 'financial')).toBe('‪¥‬1,500');
      expect(format.forEdit(150000)).toBe('1,500');
      expect(format.fromEdit('1500')).toBe(150000);
      // A typed fraction is kept; only the display rounds
      expect(format.fromEdit('1500.5')).toBe(150050);
    },
  );
});
