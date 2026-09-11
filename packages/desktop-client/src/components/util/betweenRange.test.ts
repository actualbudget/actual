import { currentDay } from '@actual-app/core/shared/months';
import { describe, expect, it } from 'vitest';

import {
  normalizeAmountRange,
  normalizeConditionRange,
  normalizeDateRange,
  rangeForCondition,
} from './betweenRange';

describe('normalizeDateRange', () => {
  it('leaves a complete range untouched', () => {
    expect(
      normalizeDateRange({ num1: '2020-08-10', num2: '2020-08-20' }),
    ).toEqual({ num1: '2020-08-10', num2: '2020-08-20' });
  });

  it('seeds both bounds from a bare value', () => {
    expect(normalizeDateRange('2020-08-10')).toEqual({
      num1: '2020-08-10',
      num2: '2020-08-10',
    });
  });

  it('keeps the lower bound of a half-formed range', () => {
    expect(normalizeDateRange({ num1: '2020-08-10' })).toEqual({
      num1: '2020-08-10',
      num2: '2020-08-10',
    });
  });

  it('keeps the upper bound of a half-formed range', () => {
    expect(normalizeDateRange({ num2: '2020-08-20' })).toEqual({
      num1: '2020-08-20',
      num2: '2020-08-20',
    });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a recurring schedule', { frequency: 'monthly' }],
  ])('falls back to today for %s', (_label, value) => {
    expect(normalizeDateRange(value)).toEqual({
      num1: currentDay(),
      num2: currentDay(),
    });
  });
});

describe('normalizeAmountRange', () => {
  it('leaves a complete range untouched', () => {
    expect(normalizeAmountRange({ num1: 1500, num2: 3000 })).toEqual({
      num1: 1500,
      num2: 3000,
    });
  });

  it('seeds both bounds from a bare value', () => {
    expect(normalizeAmountRange(1500)).toEqual({ num1: 1500, num2: 1500 });
  });

  it('keeps the lower bound of a half-formed range', () => {
    expect(normalizeAmountRange({ num1: 1500 })).toEqual({
      num1: 1500,
      num2: 1500,
    });
  });

  it('keeps the upper bound of a half-formed range', () => {
    expect(normalizeAmountRange({ num2: 3000 })).toEqual({
      num1: 3000,
      num2: 3000,
    });
  });

  it('keeps a zero bound rather than treating it as missing', () => {
    expect(normalizeAmountRange({ num1: 0, num2: 3000 })).toEqual({
      num1: 0,
      num2: 3000,
    });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('falls back to zero for %s', (_label, value) => {
    expect(normalizeAmountRange(value)).toEqual({ num1: 0, num2: 0 });
  });
});

describe('rangeForCondition', () => {
  it('reads a date condition through the date bounds', () => {
    expect(
      rangeForCondition({
        field: 'date',
        type: 'date',
        op: 'isbetween',
        value: { num1: '2020-08-10' },
      }),
    ).toEqual({ num1: '2020-08-10', num2: '2020-08-10' });
  });

  it('reads an amount condition through the numeric bounds', () => {
    expect(
      rangeForCondition({
        field: 'amount',
        type: 'number',
        op: 'isbetween',
        value: 1500,
      }),
    ).toEqual({ num1: 1500, num2: 1500 });
  });

  it('falls back to the field when the condition carries no type', () => {
    // `type` is optional on a persisted condition — without the fallback a date
    // range would go through the numeric bounds and come back as zeros
    expect(
      rangeForCondition({
        field: 'date',
        op: 'isbetween',
        value: { num1: '2020-08-10', num2: '2020-08-20' },
      }),
    ).toEqual({ num1: '2020-08-10', num2: '2020-08-20' });
  });
});

describe('normalizeConditionRange', () => {
  it('leaves a condition on another operator untouched', () => {
    const cond = { field: 'date' as const, op: 'is', value: '2020-08-10' };

    expect(normalizeConditionRange(cond)).toBe(cond);
  });

  it('fills in the missing bound of a stored date range', () => {
    expect(
      normalizeConditionRange({
        field: 'date' as const,
        type: 'date',
        op: 'isbetween',
        value: { num1: '2020-08-10' },
      }),
    ).toEqual({
      field: 'date',
      type: 'date',
      op: 'isbetween',
      value: { num1: '2020-08-10', num2: '2020-08-10' },
    });
  });

  it('turns a scalar amount value into a pair', () => {
    expect(
      normalizeConditionRange({
        field: 'amount' as const,
        type: 'number',
        op: 'isbetween',
        value: 1500,
      }).value,
    ).toEqual({ num1: 1500, num2: 1500 });
  });

  it('gives a null amount value a complete pair rather than throwing', () => {
    expect(
      normalizeConditionRange({
        field: 'amount' as const,
        type: 'number',
        op: 'isbetween',
        value: null,
      }).value,
    ).toEqual({ num1: 0, num2: 0 });
  });

  it('leaves a complete range alone', () => {
    expect(
      normalizeConditionRange({
        field: 'amount' as const,
        type: 'number',
        op: 'isbetween',
        value: { num1: 1500, num2: 3000 },
      }).value,
    ).toEqual({ num1: 1500, num2: 3000 });
  });
});
