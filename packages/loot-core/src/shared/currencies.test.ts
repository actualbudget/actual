import {
  currencies,
  getCurrencyPrecisionMultiplier,
  getDecimalPlaces,
} from './currencies';

describe('getDecimalPlaces', () => {
  it('returns 2 for empty string (None)', () => {
    expect(getDecimalPlaces('')).toBe(2);
  });

  it('returns 0 for zero-decimal currencies', () => {
    expect(getDecimalPlaces('JPY')).toBe(0);
    expect(getDecimalPlaces('KRW')).toBe(0);
    expect(getDecimalPlaces('IRR')).toBe(0);
  });

  it('returns 2 for standard currencies', () => {
    expect(getDecimalPlaces('USD')).toBe(2);
    expect(getDecimalPlaces('EUR')).toBe(2);
    expect(getDecimalPlaces('GBP')).toBe(2);
  });

  it('returns 2 as safe default for unknown codes', () => {
    expect(getDecimalPlaces('XYZ')).toBe(2);
  });
});

describe('currency metadata completeness', () => {
  it('every entry has a decimalPlaces field', () => {
    for (const currency of currencies) {
      expect(typeof currency.decimalPlaces).toBe('number');
    }
  });

  it('no entry has a negative decimalPlaces', () => {
    for (const currency of currencies) {
      expect(currency.decimalPlaces).toBeGreaterThanOrEqual(0);
    }
  });

  it('first entry is None with code empty string and decimalPlaces 2', () => {
    expect(currencies[0].code).toBe('');
    expect(currencies[0].decimalPlaces).toBe(2);
  });
});

describe('getCurrencyPrecisionMultiplier', () => {
  it('returns 1 for JPY (0dp)', () => {
    expect(getCurrencyPrecisionMultiplier('JPY')).toBe(1);
  });

  it('returns 100 for USD (2dp)', () => {
    expect(getCurrencyPrecisionMultiplier('USD')).toBe(100);
  });

  it('returns 1 for IRR (0dp)', () => {
    expect(getCurrencyPrecisionMultiplier('IRR')).toBe(1);
  });
});
