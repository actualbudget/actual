import { describe, expect, it } from 'vitest';

import {
  rangePosition,
  shiftMonths,
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

describe('shiftMonths', () => {
  it('shifts a month value while keeping month shape', () => {
    expect(shiftMonths('2020-03', -1)).toBe('2020-02');
    expect(shiftMonths('2020-03', 1)).toBe('2020-04');
  });

  it('shifts a day value while preserving day-of-month', () => {
    expect(shiftMonths('2020-03-15', -1)).toBe('2020-02-15');
    expect(shiftMonths('2020-03-15', 1)).toBe('2020-04-15');
  });

  it('clamps a day value when the target month is shorter', () => {
    // Jan 31 shifted forward a month lands on the last day of February.
    expect(shiftMonths('2020-01-31', 1)).toBe('2020-02-29');
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
