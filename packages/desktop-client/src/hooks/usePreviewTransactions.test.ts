import { describe, expect, test } from 'vitest';

import { comparePreviewTransactions } from './usePreviewTransactions';

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
