import {
  getCurrencyDisplaySymbol,
  getLocalCurrencySymbol,
  parseDefaultCurrencySymbol,
} from './symbols';

describe('getLocalCurrencySymbol', () => {
  it('returns the symbol used in the country of the currency', () => {
    expect(getLocalCurrencySymbol('CAD')).toBe('$');
    expect(getLocalCurrencySymbol('USD')).toBe('$');
    expect(getLocalCurrencySymbol('COP')).toBe('$');
    expect(getLocalCurrencySymbol('EUR')).toBe('€');
    expect(getLocalCurrencySymbol('JPY')).toBe('¥');
    expect(getLocalCurrencySymbol('GBP')).toBe('£');
  });

  it('keeps listed symbols that are not a prefixed narrow symbol', () => {
    expect(getLocalCurrencySymbol('CHF')).toBe('CHF');
    expect(getLocalCurrencySymbol('UYU')).toBe('$U');
    expect(getLocalCurrencySymbol('AED')).toBe('د.إ');
  });
});

describe('getCurrencyDisplaySymbol', () => {
  const cad = { defaultCurrencyCode: 'CAD' };

  it('shows no symbol for the default currency by default', () => {
    expect(getCurrencyDisplaySymbol('CAD', cad)).toBe('');
    expect(
      getCurrencyDisplaySymbol('CAD', { ...cad, defaultSymbol: 'none' }),
    ).toBe('');
  });

  it('can show the plain local symbol for the default currency', () => {
    expect(
      getCurrencyDisplaySymbol('CAD', { ...cad, defaultSymbol: 'symbol' }),
    ).toBe('$');
    expect(
      getCurrencyDisplaySymbol('EUR', {
        defaultCurrencyCode: 'EUR',
        defaultSymbol: 'symbol',
      }),
    ).toBe('€');
  });

  it('can show code and symbol for the default currency', () => {
    expect(
      getCurrencyDisplaySymbol('CAD', { ...cad, defaultSymbol: 'code' }),
    ).toBe('CAD$');
  });

  it.each(['none', 'symbol', 'code'] as const)(
    'puts the code in front of other symbols with the %s default symbol',
    defaultSymbol => {
      expect(getCurrencyDisplaySymbol('USD', { ...cad, defaultSymbol })).toBe(
        'USD$',
      );
    },
  );

  it('always puts the code in front of the symbol for other currencies', () => {
    expect(getCurrencyDisplaySymbol('COP', cad)).toBe('COP$');
    expect(getCurrencyDisplaySymbol('EUR', cad)).toBe('EUR€');
    expect(
      getCurrencyDisplaySymbol('CAD', { defaultCurrencyCode: 'USD' }),
    ).toBe('CAD$');
  });

  it('uses only the code when the symbol is made of letters', () => {
    expect(getCurrencyDisplaySymbol('SEK', cad)).toBe('SEK');
    expect(getCurrencyDisplaySymbol('CHF', cad)).toBe('CHF');
    expect(
      getCurrencyDisplaySymbol('SEK', {
        defaultCurrencyCode: 'SEK',
        defaultSymbol: 'symbol',
      }),
    ).toBe('kr');
  });
});

describe('parseDefaultCurrencySymbol', () => {
  it('defaults to no symbol', () => {
    expect(parseDefaultCurrencySymbol(undefined)).toBe('none');
    expect(parseDefaultCurrencySymbol('unknown')).toBe('none');
    expect(parseDefaultCurrencySymbol('symbol')).toBe('symbol');
    expect(parseDefaultCurrencySymbol('code')).toBe('code');
  });
});
