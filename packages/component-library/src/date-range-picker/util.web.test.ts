import { describe, expect, it } from 'vitest';

import {
  clamp,
  firstDayOfMonth,
  formatDate,
  lastDayOfMonth,
  monthFromIndex,
  rangePosition,
  valueIsDay,
} from './util';

describe('valueIsDay', () => {
  it('is false for month-shaped values', () => {
    expect(valueIsDay('2020-01')).toBe(false);
  });

  it('is true for day-shaped values', () => {
    expect(valueIsDay('2020-01-15')).toBe(true);
  });

  it('is false for empty or malformed values', () => {
    expect(valueIsDay('')).toBe(false);
    expect(valueIsDay('garbage')).toBe(false);
    expect(valueIsDay('2020-1-15')).toBe(false);
    expect(valueIsDay('2020-13-01')).toBe(false);
    expect(valueIsDay('2020-01-32')).toBe(false);
  });
});

describe('clamp', () => {
  it('leaves a value within bounds unchanged', () => {
    expect(clamp('2020-05', '2020-01', '2020-12')).toBe('2020-05');
    expect(clamp('2020-02-15', '2020-01-01', '2020-12-31')).toBe('2020-02-15');
  });

  it('clamps a value outside the bounds', () => {
    expect(clamp('2019-12', '2020-01', '2020-12')).toBe('2020-01');
    expect(clamp('2021-01', '2020-01', '2020-12')).toBe('2020-12');
    expect(clamp('2019-12-31', '2020-01-01', '2020-12-31')).toBe('2020-01-01');
    expect(clamp('2021-01-01', '2020-01-01', '2020-12-31')).toBe('2020-12-31');
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

describe('date helpers', () => {
  it('widens month values to their first and last day', () => {
    expect(firstDayOfMonth('2020-02')).toBe('2020-02-01');
    expect(lastDayOfMonth('2020-02')).toBe('2020-02-29');
    expect(lastDayOfMonth('2021-02-10')).toBe('2021-02-28');
    expect(lastDayOfMonth('2020-12')).toBe('2020-12-31');
  });

  it('builds months from a year and index', () => {
    expect(monthFromIndex('2020', 0)).toBe('2020-01');
    expect(monthFromIndex('2020', 11)).toBe('2020-12');
  });

  it('formats month- and day-shaped values without timezone shifts', () => {
    expect(
      formatDate('2020-01', 'en-US', { month: 'short', year: 'numeric' }),
    ).toBe('Jan 2020');
    expect(
      formatDate('2020-01-15', 'en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }),
    ).toBe('1/15/2020');
  });
});
