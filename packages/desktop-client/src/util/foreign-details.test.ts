import type { TFunction } from 'i18next';

import { amountDetailsText, nativeLine, storedPair } from './foreign-details';
import { mapField } from './rule';

// Interpolates like i18next so the sentences can be checked as shown.
const t = ((key: string, values: Record<string, string> = {}) =>
  key.replace(/{{(\w+)}}/g, (_, name) => values[name])) as TFunction;

const yen = { name: 'Yen', currency: 'JPY', currency_precision: 0 };
const pair = { account: yen, basePrecision: 2, baseCurrency: 'USD' };

describe('amount details', () => {
  it('describes whichever half the view does not show', () => {
    expect(
      amountDetailsText(t, { ...pair, native: -1500, base: -1000 }, false),
    ).toBe('-1,500 JPY in Yen. Effective rate: 1 JPY = 0.00666667 USD.');
    expect(
      amountDetailsText(t, { ...pair, native: -1500, base: -1000 }, true),
    ).toBe('Base: -10.00 USD. Effective rate: 1 JPY = 0.00666667 USD.');
    expect(amountDetailsText(t, { ...pair, native: -1, base: 0 }, false)).toBe(
      '-1 JPY in Yen. No effective rate (one amount is zero).',
    );
  });

  it('reads the stored pair from either register view', () => {
    expect(storedPair({ amount: -1000, transaction_amount: -1500 })).toEqual({
      native: -1500,
      base: -1000,
      nativeView: false,
    });
    expect(
      storedPair({
        amount: -1500,
        transaction_amount: -1500,
        _baseAmount: -1000,
      }),
    ).toEqual({ native: -1500, base: -1000, nativeView: true });
    expect(storedPair({ amount: -500, transaction_amount: null })).toBeNull();
  });

  it('adds a native line only to foreign rows in budget-currency lists', () => {
    const kwd = { currency: 'KWD', currency_precision: 3 };
    expect(nativeLine({ amount: -1033, transaction_amount: -3100 }, kwd)).toBe(
      '-3.100 KWD',
    );
    expect(
      nativeLine(
        { amount: -3100, transaction_amount: -3100, _baseAmount: -1033 },
        kwd,
      ),
    ).toBeNull();
    expect(
      nativeLine(
        { amount: -500, transaction_amount: null },
        { currency: null, currency_precision: null },
      ),
    ).toBeNull();
  });
});

describe('amount filter labels', () => {
  it('names base amounts in a foreign register', () => {
    expect(mapField('amount', { base: true })).toBe('base amount');
    expect(mapField('amount', { base: true, inflow: true })).toBe(
      'base amount (inflow)',
    );
    expect(mapField('amount-outflow', { base: true })).toBe(
      'base amount (outflow)',
    );
    expect(mapField('amount')).toBe('amount');
  });
});
