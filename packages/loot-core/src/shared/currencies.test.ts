import { currencies, getDecimalPlaces } from './currencies';

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

describe('currency metadata', () => {
  it.each(currencies)(
    '$name ($code) has a numeric decimalPlaces field',
    currency => {
      expect(typeof currency.decimalPlaces).toBe('number');
    },
  );

  it.each(currencies)(
    '$name ($code) has non-negative decimalPlaces',
    currency => {
      expect(currency.decimalPlaces).toBeGreaterThanOrEqual(0);
    },
  );

  it('first entry is None with code empty string and decimalPlaces 2', () => {
    expect(currencies[0].code).toBe('');
    expect(currencies[0].decimalPlaces).toBe(2);
  });
});
