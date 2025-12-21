import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { applyPayPeriodPrefs } from 'loot-core/shared/pay-periods';

import {
  convertPayPeriodToDateRange,
  createTransactionFilterConditions,
} from './usePayPeriodTranslation';

beforeEach(() => {
  // Set up pay period configuration for testing
  global.currentMonth = '2024-13';
  applyPayPeriodPrefs({
    showPayPeriods: 'true',
    payPeriodFrequency: 'biweekly',
    payPeriodStartDate: '2024-01-05',
  });
});

afterEach(() => {
  applyPayPeriodPrefs({});
  global.currentMonth = null;
});

describe('Pay Period Translation Utilities', () => {
  test('convertPayPeriodToDateRange converts pay periods to date ranges', () => {
    const range = convertPayPeriodToDateRange('2024-13');

    expect(range.start).toBe('2024-01-05');
    expect(range.end).toBe('2024-01-18');
  });

  test('convertPayPeriodToDateRange throws for invalid pay periods', () => {
    expect(() => convertPayPeriodToDateRange('2024-01')).toThrow(
      'Invalid pay period month: 2024-01',
    );
  });

  test('createTransactionFilterConditions creates date range filters for pay periods', () => {
    const conditions = createTransactionFilterConditions(
      '2024-13',
      'test-category',
    );

    expect(conditions).toEqual([
      { field: 'category', op: 'is', value: 'test-category', type: 'id' },
      { field: 'date', op: 'gte', value: '2024-01-05', type: 'date' },
      { field: 'date', op: 'lte', value: '2024-01-18', type: 'date' },
    ]);
  });

  test('createTransactionFilterConditions creates month filters for calendar months', () => {
    const conditions = createTransactionFilterConditions(
      '2024-01',
      'test-category',
    );

    expect(conditions).toEqual([
      { field: 'category', op: 'is', value: 'test-category', type: 'id' },
      {
        field: 'date',
        op: 'is',
        value: '2024-01',
        options: { month: true },
        type: 'date',
      },
    ]);
  });

  test('createTransactionFilterConditions creates date range filters for pay periods', () => {
    const filter = createTransactionFilterConditions(
      '2024-13',
      'test-category',
    );

    expect(filter).toEqual([
      {
        field: 'category',
        op: 'is',
        type: 'id',
        value: 'test-category',
      },
      {
        field: 'date',
        op: 'gte',
        type: 'date',
        value: '2024-01-05',
      },
      {
        field: 'date',
        op: 'lte',
        type: 'date',
        value: '2024-01-18',
      },
    ]);
  });

  test('createTransactionFilterConditions creates month transform filters for calendar months', () => {
    const filter = createTransactionFilterConditions(
      '2024-01',
      'test-category',
    );

    expect(filter).toEqual([
      {
        field: 'category',
        op: 'is',
        type: 'id',
        value: 'test-category',
      },
      {
        field: 'date',
        op: 'is',
        type: 'date',
        value: '2024-01',
        options: { month: true },
      },
    ]);
  });

  test('handles different pay period frequencies', () => {
    // Test with different pay period (2nd biweekly period)
    const range14 = convertPayPeriodToDateRange('2024-14');

    expect(range14.start).toBe('2024-01-19');
    expect(range14.end).toBe('2024-02-01');
  });
});
