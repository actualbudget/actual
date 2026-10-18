import { getEffectiveCurrency, isSupportedCurrencyCode } from './currency';

describe('isSupportedCurrencyCode', () => {
  it('accepts listed currencies, whatever their decimal places', () => {
    expect(isSupportedCurrencyCode('CAD')).toBe(true);
    expect(isSupportedCurrencyCode('COP')).toBe(true);
    expect(isSupportedCurrencyCode('JPY')).toBe(true);
    expect(isSupportedCurrencyCode('KRW')).toBe(true);
  });

  it('rejects the "None" entry and unknown codes', () => {
    expect(isSupportedCurrencyCode('')).toBe(false);
    expect(isSupportedCurrencyCode('XYZ')).toBe(false);
    expect(isSupportedCurrencyCode('usd')).toBe(false);
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
