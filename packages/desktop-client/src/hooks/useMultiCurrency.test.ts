import { renderHook } from '@testing-library/react';

import { useMultiCurrency } from './useMultiCurrency';

let mockPrefs: Record<string, string | undefined> = {};

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

function renderMultiCurrency(prefs: Record<string, string | undefined>) {
  mockPrefs = prefs;
  return renderHook(() => useMultiCurrency()).result.current;
}

const flagsOn = { 'flags.currency': 'true', 'flags.multiCurrency': 'true' };

describe('useMultiCurrency', () => {
  it.each(['CAD', 'USD', 'COP', 'JPY', 'KRW'])(
    'is enabled with %s as the default',
    code => {
      expect(
        renderMultiCurrency({ ...flagsOn, defaultCurrencyCode: code })
          .isEnabled,
      ).toBe(true);
    },
  );

  it.each([
    ['no', ''],
    ['an unknown currency', 'XYZ'],
  ])('is off with %s as the default', (_, code) => {
    expect(
      renderMultiCurrency({ ...flagsOn, defaultCurrencyCode: code }).isEnabled,
    ).toBe(false);
  });

  it('is off without both feature flags', () => {
    expect(
      renderMultiCurrency({
        'flags.currency': 'true',
        defaultCurrencyCode: 'CAD',
      }).isEnabled,
    ).toBe(false);
    expect(
      renderMultiCurrency({
        'flags.multiCurrency': 'true',
        defaultCurrencyCode: 'CAD',
      }).isEnabled,
    ).toBe(false);
  });
});
