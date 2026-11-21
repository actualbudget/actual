import { buildRateIndex, findRate } from './rates';
import type { RateRecord } from './rates';

let nextId = 0;
function rate(
  from: string,
  to: string,
  value: number,
  date: string,
  extra: Partial<RateRecord> = {},
): RateRecord {
  nextId += 1;
  return {
    id: `rate-${String(nextId).padStart(3, '0')}`,
    from_currency: from,
    to_currency: to,
    rate: value,
    date,
    source: 'manual',
    created_at: nextId,
    ...extra,
  };
}

describe('findRate', () => {
  it('returns an identity rate for the same currency', () => {
    const index = buildRateIndex([]);
    expect(findRate(index, 'CAD', 'CAD')).toEqual({
      rate: 1,
      date: null,
      path: 'identity',
      isFallback: false,
    });
  });

  it('returns null when no rate path exists', () => {
    const index = buildRateIndex([rate('USD', 'CAD', 1.38, '2026-01-01')]);
    expect(findRate(index, 'COP', 'CAD')).toBeNull();
  });

  it('uses the direct pair', () => {
    const index = buildRateIndex([rate('USD', 'CAD', 1.38, '2026-01-01')]);
    expect(findRate(index, 'USD', 'CAD')).toMatchObject({
      rate: 1.38,
      path: 'direct',
      isFallback: false,
    });
  });

  it('inverts a pair stored in the opposite direction', () => {
    const index = buildRateIndex([rate('CAD', 'COP', 3000, '2026-01-01')]);
    const lookup = findRate(index, 'COP', 'CAD');
    expect(lookup?.path).toBe('inverse');
    expect(lookup?.rate).toBeCloseTo(1 / 3000, 12);
  });

  it('picks the latest rate on or before the date', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 1.3, '2026-01-01'),
      rate('USD', 'CAD', 1.35, '2026-02-01'),
      rate('USD', 'CAD', 1.4, '2026-03-01'),
    ]);
    expect(findRate(index, 'USD', 'CAD', '2026-02-15')?.rate).toBe(1.35);
    expect(findRate(index, 'USD', 'CAD', '2026-02-01')?.rate).toBe(1.35);
    expect(findRate(index, 'USD', 'CAD', '2026-12-31')?.rate).toBe(1.4);
  });

  it('uses the latest rate when no date is given', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 1.4, '2026-03-01'),
      rate('USD', 'CAD', 1.3, '2026-01-01'),
    ]);
    expect(findRate(index, 'USD', 'CAD')?.rate).toBe(1.4);
  });

  it('falls back to the earliest later rate', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 1.35, '2026-02-01'),
      rate('USD', 'CAD', 1.4, '2026-03-01'),
    ]);
    expect(findRate(index, 'USD', 'CAD', '2025-06-01')).toMatchObject({
      rate: 1.35,
      date: '2026-02-01',
      isFallback: true,
    });
  });

  it('prefers a rate on or before the date over a fallback in the other direction', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 1.4, '2026-03-01'),
      rate('CAD', 'USD', 0.8, '2026-01-01'),
    ]);
    const lookup = findRate(index, 'USD', 'CAD', '2026-02-01');
    expect(lookup?.path).toBe('inverse');
    expect(lookup?.rate).toBeCloseTo(1.25, 12);
    expect(lookup?.isFallback).toBe(false);
  });

  it('prefers the more recent of the direct and inverse rates', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 1.3, '2026-01-01'),
      rate('CAD', 'USD', 0.8, '2026-02-01'),
    ]);
    expect(findRate(index, 'USD', 'CAD', '2026-03-01')?.path).toBe('inverse');
  });

  it('prefers the direct pair when both directions share a date', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 1.38, '2026-01-01'),
      rate('CAD', 'USD', 0.7, '2026-01-01'),
    ]);
    expect(findRate(index, 'USD', 'CAD')?.path).toBe('direct');
  });

  it.each([
    ['USD', 'CAD', 1.38],
    ['CAD', 'USD', 1 / 1.38],
  ])(
    'prefers a manual rate over a fetched one on the same date, converting %s to %s',
    (from, to, expected) => {
      const index = buildRateIndex([
        rate('USD', 'CAD', 1.38, '2026-01-01'),
        rate('CAD', 'USD', 0.7, '2026-01-01', { source: 'frankfurter' }),
      ]);
      expect(findRate(index, from, to)?.rate).toBeCloseTo(expected, 10);
    },
  );

  it('crosses through an intermediate currency', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 1.4, '2026-01-05'),
      rate('CAD', 'COP', 3000, '2026-01-01'),
    ]);
    const lookup = findRate(index, 'USD', 'COP');
    expect(lookup).toMatchObject({
      path: 'cross',
      date: '2026-01-01',
      isFallback: false,
    });
    expect(lookup?.rate).toBeCloseTo(4200, 9);
  });

  it('crosses through the first intermediate in alphabetical order', () => {
    const index = buildRateIndex([
      rate('USD', 'AUD', 1.5, '2026-01-01'),
      rate('AUD', 'COP', 3000, '2026-01-01'),
      rate('USD', 'CAD', 1.4, '2026-01-01'),
      rate('CAD', 'COP', 2000, '2026-01-01'),
    ]);
    expect(findRate(index, 'USD', 'COP')?.rate).toBeCloseTo(4500, 9);
  });

  it('prefers a cross rate on or before the date over a later direct rate', () => {
    const index = buildRateIndex([
      rate('USD', 'EUR', 0.9, '2026-11-01'),
      rate('USD', 'CAD', 1.4, '2026-10-01'),
      rate('CAD', 'EUR', 0.7, '2026-10-01'),
    ]);
    const lookup = findRate(index, 'USD', 'EUR', '2026-10-15');
    expect(lookup).toMatchObject({ path: 'cross', isFallback: false });
    expect(lookup?.rate).toBeCloseTo(0.98, 12);

    // On or after the direct rate's date, the direct rate wins
    expect(findRate(index, 'USD', 'EUR', '2026-11-01')).toMatchObject({
      rate: 0.9,
      path: 'direct',
    });
  });

  it('prefers a later direct rate over a later cross rate', () => {
    const index = buildRateIndex([
      rate('USD', 'EUR', 0.9, '2026-12-01'),
      rate('USD', 'CAD', 1.4, '2026-11-01'),
      rate('CAD', 'EUR', 0.7, '2026-11-01'),
    ]);
    expect(findRate(index, 'USD', 'EUR', '2026-10-01')).toMatchObject({
      rate: 0.9,
      path: 'direct',
      isFallback: true,
    });
  });

  it('prefers an intermediate with rates on or before the date over an earlier one in the alphabet with a later rate', () => {
    const index = buildRateIndex([
      rate('USD', 'AUD', 1.5, '2026-09-01'),
      rate('AUD', 'EUR', 0.5, '2026-12-01'),
      rate('USD', 'CAD', 1.4, '2026-09-01'),
      rate('CAD', 'EUR', 0.7, '2026-09-15'),
    ]);
    const lookup = findRate(index, 'USD', 'EUR', '2026-10-01');
    expect(lookup).toMatchObject({
      path: 'cross',
      date: '2026-09-01',
      isFallback: false,
    });
    expect(lookup?.rate).toBeCloseTo(0.98, 12);

    // Before both routes, the first intermediate in the alphabet is used
    expect(findRate(index, 'USD', 'EUR', '2026-08-01')).toMatchObject({
      path: 'cross',
      isFallback: true,
    });
    expect(findRate(index, 'USD', 'EUR', '2026-08-01')?.rate).toBeCloseTo(
      0.75,
      12,
    );
  });

  it('resolves routes the same way whatever the order of the rates', () => {
    const records = [
      rate('USD', 'AUD', 1.5, '2026-01-01'),
      rate('AUD', 'EUR', 0.5, '2026-01-01'),
      rate('EUR', 'CAD', 1.5, '2026-01-01'),
      rate('CAD', 'USD', 0.7, '2026-01-01'),
      rate('USD', 'GBP', 0.8, '2026-01-01'),
      rate('GBP', 'EUR', 1.1, '2026-01-01'),
    ];
    const expected = findRate(buildRateIndex(records), 'USD', 'EUR');
    expect(expected?.rate).toBeCloseTo(0.75, 12);
    expect(
      findRate(buildRateIndex([...records].reverse()), 'USD', 'EUR'),
    ).toEqual(expected);
  });

  it('skips inverses and cross rates that are not finite and positive', () => {
    // The inverse of this rate is Infinity
    const tiny = rate('CAD', 'COP', 1e-320, '2026-01-01');
    expect(findRate(buildRateIndex([tiny]), 'COP', 'CAD')).toBeNull();
    expect(
      findRate(
        buildRateIndex([
          tiny,
          rate('COP', 'USD', 0.00025, '2026-01-01'),
          rate('USD', 'CAD', 1.4, '2026-01-01'),
        ]),
        'COP',
        'CAD',
      ),
    ).toMatchObject({ path: 'cross' });

    // The product of these rates is Infinity
    const huge = buildRateIndex([
      rate('USD', 'CAD', 1e200, '2026-01-01'),
      rate('CAD', 'COP', 1e200, '2026-01-01'),
    ]);
    expect(findRate(huge, 'USD', 'COP')).toBeNull();
  });

  it('resolves duplicates on the same date deterministically', () => {
    const provider = rate('USD', 'CAD', 1.1, '2026-01-01', {
      source: 'provider',
      created_at: 999,
    });
    const olderManual = rate('USD', 'CAD', 1.2, '2026-01-01', {
      created_at: 1,
    });
    const newerManual = rate('USD', 'CAD', 1.3, '2026-01-01', {
      created_at: 2,
    });
    const records = [provider, olderManual, newerManual];

    expect(findRate(buildRateIndex(records), 'USD', 'CAD')?.rate).toBe(1.3);
    expect(
      findRate(buildRateIndex([...records].reverse()), 'USD', 'CAD')?.rate,
    ).toBe(1.3);

    const tieA = rate('EUR', 'CAD', 1.5, '2026-01-01', {
      id: 'a',
      created_at: 5,
    });
    const tieB = rate('EUR', 'CAD', 1.6, '2026-01-01', {
      id: 'b',
      created_at: 5,
    });
    expect(findRate(buildRateIndex([tieA, tieB]), 'EUR', 'CAD')?.rate).toBe(
      1.6,
    );
    expect(findRate(buildRateIndex([tieB, tieA]), 'EUR', 'CAD')?.rate).toBe(
      1.6,
    );
  });

  it('ignores unusable rates', () => {
    const index = buildRateIndex([
      rate('USD', 'CAD', 0, '2026-01-01'),
      rate('USD', 'CAD', -1, '2026-01-02'),
      rate('USD', 'CAD', Number.NaN, '2026-01-03'),
      rate('CAD', 'CAD', 2, '2026-01-04'),
    ]);
    expect(findRate(index, 'USD', 'CAD')).toBeNull();
  });
});
