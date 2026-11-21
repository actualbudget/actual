import {
  convertAmount,
  convertTotal,
  convertWithRates,
  getEffectiveRate,
} from './convert';
import { buildRateIndex } from './rates';
import type { RateRecord } from './rates';

function rate(
  id: string,
  from: string,
  to: string,
  value: number,
  date = '2026-01-01',
): RateRecord {
  return {
    id,
    from_currency: from,
    to_currency: to,
    rate: value,
    date,
    source: 'manual',
    created_at: 1,
  };
}

describe('convertAmount', () => {
  it('converts at the rate', () => {
    expect(convertAmount(10000, 'CAD', 1.38)).toBe(13800);
  });

  it('returns the same amount for a rate of 1', () => {
    expect(convertAmount(12345, 'CAD', 1)).toBe(12345);
  });

  it('keeps the stored scale between currencies with other decimal places', () => {
    // $100.00 at 150 JPY per USD is ¥15,000, stored as 1500000
    expect(convertAmount(10000, 'JPY', 150)).toBe(1500000);
    // ¥15,000 at 1/150 USD per JPY is $100.00
    expect(convertAmount(1500000, 'USD', 1 / 150)).toBe(10000);
  });

  it.each([
    // $1.23 at 150.5 is ¥185.115, so ¥185
    [123, 150.5, 18500],
    // $1.00 at 150.5 is ¥150.50, rounded half away from zero to ¥151
    [100, 150.5, 15100],
  ])(
    'rounds %i at %d into whole units of a currency without decimals as %i',
    (amount, rate, expected) => {
      expect(convertAmount(amount, 'JPY', rate)).toBe(expected);
      expect(convertAmount(-amount, 'JPY', rate)).toBe(-expected);
    },
  );

  it.each([1, 5, 15, 25, 123457, 999999])(
    'converts -%d symmetrically',
    amount => {
      const converted = convertAmount(amount, 'CAD', 1.5);
      expect(converted).not.toBeNull();
      expect(convertAmount(-amount, 'CAD', 1.5)).toBe(-(converted ?? 0));
    },
  );

  it.each([
    // In floating point 45 × 0.7 is 31.499999999999996
    [45, 0.7, 32],
    [85, 0.7, 60],
    [100, 1.005, 101],
    // A cross rate: 0.7 × 1.5 is 1.0499999999999998
    [10, 0.7 * 1.5, 11],
    [129, 0.05, 6],
    [11, 1.15, 13],
  ])('rounds %i at %d half away from zero to %i', (amount, rate, expected) => {
    expect(convertAmount(amount, 'CAD', rate)).toBe(expected);
    expect(convertAmount(-amount, 'CAD', rate)).toBe(-expected);
  });

  it('keeps every unit of large amounts', () => {
    expect(convertAmount(123456789012345, 'CAD', 1)).toBe(123456789012345);
    expect(convertAmount(2 ** 51 - 1, 'CAD', 1)).toBe(2 ** 51 - 1);
    expect(convertAmount(99999999999, 'CAD', 1.5)).toBe(149999999999);
    expect(convertAmount(1234567890123, 'CAD', 0.5)).toBe(617283945062);
  });

  it('never returns negative zero', () => {
    expect(Object.is(convertAmount(-1, 'CAD', 0.0003), 0)).toBe(true);
  });

  it('converts tiny rates', () => {
    // 1,000,000.00 COP at 0.00033 CAD per COP is 330.00 CAD
    expect(convertAmount(100000000, 'CAD', 0.00033)).toBe(33000);
  });

  it('gives null when the result is too large to be safe', () => {
    expect(convertAmount(2 ** 50, 'CAD', 1000)).toBeNull();
    expect(convertAmount(100, 'CAD', Number.NaN)).toBeNull();
  });
});

describe('convertTotal', () => {
  const index = buildRateIndex([
    rate('r1', 'USD', 'CAD', 1.4),
    rate('r2', 'CAD', 'COP', 3000),
  ]);

  it('sums entries converted into the target currency', () => {
    const result = convertTotal(
      [
        { id: 'chequing', amount: 50000, currency: 'CAD' },
        { id: 'usd', amount: 10000, currency: 'USD' },
        { id: 'cop', amount: 300000000, currency: 'COP' },
      ],
      'CAD',
      index,
    );
    expect(result).toEqual({
      total: 50000 + 14000 + 100000,
      withoutRate: [],
      hasFallback: false,
    });
  });

  it('counts entries without a rate path 1:1', () => {
    const result = convertTotal(
      [
        { id: 'chequing', amount: 50000, currency: 'CAD' },
        { id: 'euro', amount: 10000, currency: 'EUR' },
        { id: 'yen', amount: 150000, currency: 'JPY' },
      ],
      'CAD',
      index,
    );
    // ¥1,500 counts as 1,500.00 CAD
    expect(result.total).toBe(50000 + 10000 + 150000);
    expect(result.withoutRate).toEqual([
      { id: 'euro', currency: 'EUR' },
      { id: 'yen', currency: 'JPY' },
    ]);
  });

  it('equals a plain sum when there are no rates at all', () => {
    const entries = [
      { id: 'a', amount: 12345, currency: 'CAD' },
      { id: 'b', amount: -678, currency: 'USD' },
      { id: 'c', amount: 900, currency: 'COP' },
    ];
    expect(convertTotal(entries, 'CAD', buildRateIndex([])).total).toBe(
      12345 - 678 + 900,
    );
  });

  it('reports when a later-dated rate was used', () => {
    const result = convertTotal(
      [{ id: 'usd', amount: 10000, currency: 'USD' }],
      'CAD',
      index,
      '2025-01-01',
    );
    expect(result).toEqual({
      total: 14000,
      withoutRate: [],
      hasFallback: true,
    });
  });

  it('returns zero for no entries', () => {
    expect(convertTotal([], 'CAD', index)).toEqual({
      total: 0,
      withoutRate: [],
      hasFallback: false,
    });
  });

  it('counts an entry 1:1 when its rate makes it too large', () => {
    // A mistyped rate: 1,000,000,000,000 CAD per EUR
    const absurd = buildRateIndex([
      rate('r1', 'USD', 'CAD', 1.4),
      rate('r2', 'EUR', 'CAD', 1e12),
    ]);
    const result = convertTotal(
      [
        { id: 'usd', amount: 10000, currency: 'USD' },
        { id: 'euro', amount: 1000000000, currency: 'EUR' },
      ],
      'CAD',
      absurd,
    );
    expect(result).toEqual({
      total: 14000 + 1000000000,
      withoutRate: [{ id: 'euro', currency: 'EUR' }],
      hasFallback: false,
    });
  });

  it('counts an entry 1:1 when adding it would make the total unsafe', () => {
    const large = buildRateIndex([rate('r1', 'USD', 'CAD', 2)]);
    const result = convertTotal(
      [
        { id: 'chequing', amount: 2 ** 50, currency: 'CAD' },
        { id: 'usd', amount: 2 ** 49, currency: 'USD' },
      ],
      'CAD',
      large,
    );
    expect(result.total).toBe(2 ** 50 + 2 ** 49);
    expect(result.withoutRate).toEqual([{ id: 'usd', currency: 'USD' }]);
  });

  it('counts an entry 1:1 when the inverse of its rate is not finite', () => {
    const tiny = buildRateIndex([rate('r1', 'CAD', 'COP', 1e-320)]);
    expect(
      convertTotal([{ id: 'cop', amount: 5000, currency: 'COP' }], 'CAD', tiny),
    ).toEqual({
      total: 5000,
      withoutRate: [{ id: 'cop', currency: 'COP' }],
      hasFallback: false,
    });
  });
});

describe('convertWithRates', () => {
  const index = buildRateIndex([rate('r1', 'USD', 'CAD', 1.4)]);

  it('returns the rate lookup that was used', () => {
    const result = convertWithRates(10000, 'USD', 'CAD', index);
    expect(result.amount).toBe(14000);
    expect(result.lookup?.path).toBe('direct');
  });

  it('counts 1:1 without a rate path', () => {
    expect(convertWithRates(10000, 'EUR', 'CAD', index)).toEqual({
      amount: 10000,
      lookup: null,
    });
  });

  it('counts an amount 1:1 when its conversion is too large to be safe', () => {
    const absurd = buildRateIndex([rate('r1', 'EUR', 'CAD', 1e12)]);
    expect(convertWithRates(1000000000, 'EUR', 'CAD', absurd)).toEqual({
      amount: 1000000000,
      lookup: null,
    });
  });
});

describe('getEffectiveRate', () => {
  it.each([
    // CA$1,500.00 left, USD$1,000.00 arrived
    [-150000, 100000, 1000 / 1500],
    [100000, -150000, 1.5],
    // ¥15,000 left, USD$100.00 arrived
    [-1500000, 10000, 100 / 15000],
    [-10000, 1500000, 150],
    [-150000, 0, 0],
  ])('%i for %i', (fromAmount, toAmount, expected) => {
    expect(getEffectiveRate(fromAmount, toAmount)).toBeCloseTo(expected, 10);
  });

  it('is unknown when nothing left', () => {
    expect(getEffectiveRate(0, 100000)).toBeNull();
  });
});
