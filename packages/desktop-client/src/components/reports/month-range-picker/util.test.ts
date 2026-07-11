import { describe, expect, it } from 'vitest';

import {
  clamp,
  rangePosition,
  toDayEnd,
  toDayStart,
  toMonth,
  valueIsDay,
} from './util';

describe('valueIsDay', () => {
  it('is false for month-shaped values', () => {
    expect(valueIsDay('2020-01')).toBe(false);
  });

  it('is true for day-shaped values', () => {
    expect(valueIsDay('2020-01-15')).toBe(true);
  });
});

describe('toMonth', () => {
  it('collapses a day value to its month', () => {
    expect(toMonth('2020-01-15')).toBe('2020-01');
  });

  it('leaves a month value unchanged', () => {
    expect(toMonth('2020-01')).toBe('2020-01');
  });
});

describe('toDayStart / toDayEnd', () => {
  it('expands a month to its first and last day', () => {
    expect(toDayStart('2020-02')).toBe('2020-02-01');
    expect(toDayEnd('2020-02')).toBe('2020-02-29'); // leap year
  });

  it('normalizes a day value to whole-month bounds', () => {
    expect(toDayStart('2020-02-15')).toBe('2020-02-01');
    expect(toDayEnd('2020-02-15')).toBe('2020-02-29');
  });
});

describe('clamp', () => {
  it('leaves a month value within month bounds unchanged', () => {
    expect(clamp('2020-05', '2020-01', '2020-12')).toBe('2020-05');
  });

  it('clamps a month value outside month bounds', () => {
    expect(clamp('2019-12', '2020-01', '2020-12')).toBe('2020-01');
    expect(clamp('2021-01', '2020-01', '2020-12')).toBe('2020-12');
  });

  it('normalizes month-shaped bounds to day granularity for a day value', () => {
    // `min`/`max` may still be `yyyy-MM` (e.g. a report's `minDate`) even
    // while the picker is in day mode; the result must stay day-shaped.
    expect(clamp('2020-02-15', '2020-01', '2020-12')).toBe('2020-02-15');
    expect(clamp('2019-12-31', '2020-01', '2020-12')).toBe('2020-01-01');
    expect(clamp('2021-01-01', '2020-01', '2020-12')).toBe('2020-12-31');
  });
});

describe('rangePosition', () => {
  it('is null outside the range', () => {
    expect(rangePosition('2020-01', '2020-03', '2020-06')).toBe(null);
    expect(rangePosition('2020-08', '2020-03', '2020-06')).toBe(null);
  });

  it('marks the start and end edges', () => {
    expect(rangePosition('2020-03', '2020-03', '2020-06')).toBe('start');
    expect(rangePosition('2020-06', '2020-03', '2020-06')).toBe('end');
  });

  it('marks interior cells as middle', () => {
    expect(rangePosition('2020-04', '2020-03', '2020-06')).toBe('middle');
  });

  it('treats a single-cell range as start', () => {
    expect(rangePosition('2020-03', '2020-03', '2020-03')).toBe('start');
  });
});
