import { describe, expect, it } from 'vitest';

import { clamp, rangePosition, valueIsDay } from './util';

describe('valueIsDay', () => {
  it('is false for month-shaped values', () => {
    expect(valueIsDay('2020-01')).toBe(false);
  });

  it('is true for day-shaped values', () => {
    expect(valueIsDay('2020-01-15')).toBe(true);
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
