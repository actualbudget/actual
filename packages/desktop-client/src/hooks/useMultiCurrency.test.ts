import { renderHook } from '@testing-library/react';

import { useForeignCurrencyCode, useMultiCurrency } from './useMultiCurrency';

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

describe('useForeignCurrencyCode', () => {
  function renderForeignCurrencyCode(
    prefs: Record<string, string | undefined>,
    currencyCode: string | null | undefined,
  ) {
    mockPrefs = prefs;
    return renderHook(() => useForeignCurrencyCode(currencyCode)).result
      .current;
  }

  it.each([
    ['USD', 'USD'],
    ['JPY', 'JPY'],
    ['CAD', undefined],
    [null, undefined],
    [undefined, undefined],
  ])('gives %s in a CAD budget as %s', (currencyCode, expected) => {
    expect(
      renderForeignCurrencyCode(
        { ...flagsOn, defaultCurrencyCode: 'CAD' },
        currencyCode,
      ),
    ).toBe(expected);
  });

  it('gives no currency while multiple currencies are off', () => {
    expect(
      renderForeignCurrencyCode(
        { 'flags.currency': 'true', defaultCurrencyCode: 'CAD' },
        'JPY',
      ),
    ).toBeUndefined();
  });
});
