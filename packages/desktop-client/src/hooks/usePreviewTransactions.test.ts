import type { ScheduleEntity } from '@actual-app/core/types/models';
import { describe, expect, test } from 'vitest';

import {
  comparePreviewTransactions,
  previewScheduleFilter,
} from './usePreviewTransactions';

describe('comparePreviewTransactions', () => {
  test('sorts by date descending first', () => {
    const a = { date: '2024-01-01', amount: 100, sort_order: 0 };
    const b = { date: '2024-01-05', amount: 100, sort_order: 0 };
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
    expect(comparePreviewTransactions(b, a)).toBeLessThan(0);
  });

  test('same date: sorts by sort_order descending', () => {
    const a = { date: '2024-01-01', amount: 100, sort_order: 5 };
    const b = { date: '2024-01-01', amount: 100, sort_order: 10 };
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
    expect(comparePreviewTransactions(b, a)).toBeLessThan(0);
  });

  test('same date, null/equal sort_order: falls back to amount ascending', () => {
    const a = { date: '2024-01-01', amount: 200, sort_order: null };
    const b = { date: '2024-01-01', amount: 100, sort_order: null };
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
    expect(comparePreviewTransactions(b, a)).toBeLessThan(0);
  });

  test('same date, one sort_order undefined treated as 0', () => {
    const a = { date: '2024-01-01', amount: 100, sort_order: undefined };
    const b = { date: '2024-01-01', amount: 999, sort_order: 5 };
    // b has higher sort_order (5 > 0), so b sorts first regardless of amount
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
  });
});

describe('previewScheduleFilter', () => {
  const accounts = [
    { id: 'usd', currency: null },
    { id: 'jpy', currency: 'JPY' },
  ];
  const schedule = (account: string | null) =>
    ({ _account: account }) as ScheduleEntity;

  test('base views leave out foreign schedules until posted', () => {
    const filter = previewScheduleFilter(accounts, undefined);
    expect(filter(schedule('usd'))).toBe(true);
    expect(filter(schedule(null))).toBe(true);
    expect(filter(schedule('jpy'))).toBe(false);
  });

  test('a base register keeps transfers from other base accounts', () => {
    const filter = previewScheduleFilter(accounts, 'usd');
    expect(filter(schedule('usd'))).toBe(true);
    expect(filter(schedule('other'))).toBe(true);
    expect(filter(schedule('jpy'))).toBe(false);
  });

  test('a foreign register shows only its own schedules', () => {
    const filter = previewScheduleFilter(accounts, 'jpy');
    expect(filter(schedule('jpy'))).toBe(true);
    // A base schedule transferring to the yen account is in dollars.
    expect(filter(schedule('usd'))).toBe(false);
    expect(filter(schedule(null))).toBe(false);
    expect(
      previewScheduleFilter(accounts, 'jpy', () => false)(schedule('jpy')),
    ).toBe(false);
  });
});
