import { describe, expect, it } from 'vitest';

import { countFilteredIntervals } from './countFilteredIntervals';

describe('countFilteredIntervals', () => {
  const start = '2025-12-15';
  const end = '2026-04-15';
  const payee = { payee: { $eq: 'payee-id' } };
  const january = {
    $and: [{ date: { $gte: '2026-01-00' } }, { date: { $lte: '2026-01-99' } }],
  };

  it('applies strict comparisons at month boundaries', () => {
    expect(
      countFilteredIntervals(
        start,
        end,
        'Monthly',
        [{ date: { $gt: '2025-12-31' } }, { date: { $lt: '2026-03-01' } }],
        'and',
      ),
    ).toBe(2);
  });

  it('counts only months with a date that satisfies every date condition', () => {
    expect(
      countFilteredIntervals(
        start,
        end,
        'Monthly',
        [{ date: { $gte: '2026-02-20' } }, { date: { $lte: '2026-02-10' } }],
        'and',
      ),
    ).toBe(0);
  });

  it('counts each month once when date alternatives overlap or have gaps', () => {
    expect(
      countFilteredIntervals(
        start,
        end,
        'Monthly',
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
    expect(countFilteredIntervals(start, end, 'Monthly', [year], 'and')).toBe(
      4,
    );
  });

  it('counts both months covered by an approximate date match', () => {
    const aroundFebruaryFirst = {
      $and: [
        { date: { $gte: '2026-01-30' } },
        { date: { $lte: '2026-02-03' } },
      ],
    };
    expect(
      countFilteredIntervals(
        start,
        end,
        'Monthly',
        [aroundFebruaryFirst],
        'and',
      ),
    ).toBe(2);
  });

  it('respects how date filters are combined with other fields', () => {
    expect(
      countFilteredIntervals(start, end, 'Monthly', [january, payee], 'and'),
    ).toBe(1);
    expect(
      countFilteredIntervals(start, end, 'Monthly', [january, payee], 'or'),
    ).toBe(5);
  });

  it('does not widen the date range for an empty category selection joined with OR', () => {
    expect(
      countFilteredIntervals(
        start,
        end,
        'Monthly',
        [{ date: '2026-01-15' }, { id: null }],
        'or',
      ),
    ).toBe(1);
  });

  it('counts July through September as one quarter', () => {
    expect(
      countFilteredIntervals(
        '2025-10-01',
        '2026-12-31',
        'Quarterly',
        [{ date: { $gte: '2026-07-01' } }, { date: { $lte: '2026-09-30' } }],
        'and',
      ),
    ).toBe(1);
  });

  it('counts both quarters when a filter crosses a quarter boundary', () => {
    expect(
      countFilteredIntervals(
        '2026-01-01',
        '2026-12-31',
        'Quarterly',
        [{ date: { $gte: '2026-06-30' } }, { date: { $lte: '2026-07-01' } }],
        'and',
      ),
    ).toBe(2);
  });

  it('excludes dates outside the report even within its boundary quarter', () => {
    expect(
      countFilteredIntervals(
        '2026-02-01',
        '2026-08-31',
        'Quarterly',
        [{ date: '2026-01-31' }, { date: '2026-09-01' }],
        'or',
      ),
    ).toBe(0);
  });
});
