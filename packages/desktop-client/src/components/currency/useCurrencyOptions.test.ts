import { renderHook } from '@testing-library/react';

import { useCurrencyOptions } from './useCurrencyOptions';

function getCodes(options: Array<[string, string]>) {
  return options.map(([code]) => code);
}

describe('useCurrencyOptions', () => {
  it('lists every supported currency for the default currency', () => {
    const { currencyOptions } = renderHook(() => useCurrencyOptions()).result
      .current;

    expect(getCodes(currencyOptions)).toEqual(
      expect.arrayContaining(['', 'CAD', 'USD', 'JPY', 'KRW']),
    );
  });

  it('lists every supported currency for accounts, whatever its decimal places', () => {
    const { getAccountCurrencyOptions } = renderHook(() => useCurrencyOptions())
      .result.current;

    const codes = getCodes(getAccountCurrencyOptions(null));
    expect(codes).toEqual(
      expect.arrayContaining(['CAD', 'USD', 'COP', 'JPY', 'KRW']),
    );
    expect(codes).not.toContain('');
  });

  it('keeps listing a currency the account already has by its code', () => {
    const { getAccountCurrencyOptions, getCurrencyLabel } = renderHook(() =>
      useCurrencyOptions(),
    ).result.current;

    // A currency this version doesn't know
    expect(getAccountCurrencyOptions('XYZ').at(-1)).toEqual([
      'XYZ',
      getCurrencyLabel('XYZ'),
    ]);
  });
});
