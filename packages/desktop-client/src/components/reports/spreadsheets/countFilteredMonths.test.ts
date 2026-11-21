import { describe, expect, it } from 'vitest';

import { countFilteredMonths } from './countFilteredMonths';

describe('countFilteredMonths', () => {
  const start = '2025-12-15';
  const end = '2026-04-15';
  const payee = { payee: { $eq: 'payee-id' } };
  const january = {
    $and: [{ date: { $gte: '2026-01-00' } }, { date: { $lte: '2026-01-99' } }],
  };

  it('applies strict comparisons at month boundaries', () => {
    expect(
      countFilteredMonths(
        start,
        end,
        [{ date: { $gt: '2025-12-31' } }, { date: { $lt: '2026-03-01' } }],
        'and',
      ),
    ).toBe(2);
  });

  it('counts only months with a date that satisfies every date condition', () => {
    expect(
      countFilteredMonths(
        start,
        end,
        [{ date: { $gte: '2026-02-20' } }, { date: { $lte: '2026-02-10' } }],
        'and',
      ),
    ).toBe(0);
  });

  it('counts each month once when date alternatives overlap or have gaps', () => {
    expect(
      countFilteredMonths(
        start,
        end,
        [january, { date: '2026-01-14' }, { date: '2026-03-01' }],
        'or',
      ),
    ).toBe(2);
  });

  it('limits a year filter to the report months', () => {
    const year = {
      $and: [
        { date: { $gte: '2026-00-00' } },
        { date: { $lte: '2026-99-99' } },
      ],
    };
    expect(countFilteredMonths(start, end, [year], 'and')).toBe(4);
  });

  it('counts both months covered by an approximate date match', () => {
    const aroundFebruaryFirst = {
      $and: [
        { date: { $gte: '2026-01-30' } },
        { date: { $lte: '2026-02-03' } },
      ],
    };
    expect(countFilteredMonths(start, end, [aroundFebruaryFirst], 'and')).toBe(
      2,
    );
  });

  it('respects how date filters are combined with other fields', () => {
    expect(countFilteredMonths(start, end, [january, payee], 'and')).toBe(1);
    expect(countFilteredMonths(start, end, [january, payee], 'or')).toBe(5);
  });

  it('does not widen the date range for an empty category selection joined with OR', () => {
    expect(
      countFilteredMonths(
        start,
        end,
        [{ date: '2026-01-15' }, { id: null }],
        'or',
      ),
    ).toBe(1);
  });
});
