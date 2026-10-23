import {
  canUseInMultiCurrency,
  getEffectiveCurrency,
  getStoredDecimalPlaces,
  isSupportedCurrencyCode,
} from './currency';

describe('isSupportedCurrencyCode', () => {
  it('accepts listed currencies', () => {
    expect(isSupportedCurrencyCode('CAD')).toBe(true);
    expect(isSupportedCurrencyCode('COP')).toBe(true);
  });

  it('rejects the "None" entry and unknown codes', () => {
    expect(isSupportedCurrencyCode('')).toBe(false);
    expect(isSupportedCurrencyCode('XYZ')).toBe(false);
    expect(isSupportedCurrencyCode('usd')).toBe(false);
  });
});

describe('canUseInMultiCurrency', () => {
  it.each([
    ['CAD', true],
    ['USD', true],
    ['COP', true],
    ['JPY', false],
    ['KWD', false],
    ['', false],
    ['XYZ', false],
  ])('%s: %s', (code, expected) => {
    expect(canUseInMultiCurrency(code)).toBe(expected);
  });
});

describe('getEffectiveCurrency', () => {
  it('uses the account currency when set', () => {
    expect(getEffectiveCurrency('USD', 'CAD')).toBe('USD');
  });

  it('falls back to the default currency', () => {
    expect(getEffectiveCurrency(null, 'CAD')).toBe('CAD');
    expect(getEffectiveCurrency(undefined, 'CAD')).toBe('CAD');
  });
});

describe('getStoredDecimalPlaces', () => {
  it.each([
    ['USD', 2],
    ['JPY', 0],
  ])('uses the decimal places of %s', (currency, decimalPlaces) => {
    expect(getStoredDecimalPlaces(currency)).toBe(decimalPlaces);
  });

  it('keeps two decimal places for accounts without a currency', () => {
    expect(getStoredDecimalPlaces(null)).toBe(2);
    expect(getStoredDecimalPlaces(undefined)).toBe(2);
  });
});
