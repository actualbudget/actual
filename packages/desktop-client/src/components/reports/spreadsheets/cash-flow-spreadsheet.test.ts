import { enUS } from 'date-fns/locale';
import { describe, expect, it } from 'vitest';

import { recalculate } from './cash-flow-spreadsheet';

const format = (value: unknown) => String(value);

type QueryRow = { date: string; isTransfer: string | null; amount: number };

function run(
  startingBalance: number,
  income: QueryRow[],
  expense: QueryRow[],
  start: string,
  end: string,
  granularity: 'Daily' | 'Monthly' | 'Yearly',
) {
  return recalculate(
    [startingBalance, income, expense],
    start,
    end,
    granularity,
    enUS,
    format,
  );
}

describe('cash-flow-spreadsheet recalculate', () => {
  describe('Monthly granularity', () => {
    it('aggregates per-month income and expenses, accumulates balance', () => {
      const result = run(
        0,
        [
          { date: '2026-01', isTransfer: null, amount: 1000 },
          { date: '2026-02', isTransfer: null, amount: 500 },
        ],
        [
          { date: '2026-01', isTransfer: null, amount: -200 },
          { date: '2026-02', isTransfer: null, amount: -100 },
        ],
        '2026-01-01',
        '2026-02-28',
        'Monthly',
      );

      expect(result.totalIncome).toBe(1500);
      expect(result.totalExpenses).toBe(-300);
      expect(result.totalTransfers).toBe(0);
      expect(result.graphData.income.map(p => p.y)).toEqual([1000, 500]);
      expect(result.graphData.expenses.map(p => p.y)).toEqual([-200, -100]);
      expect(result.graphData.balances.map(p => p.amount)).toEqual([800, 1200]);
      expect(result.balance).toBe(1200);
    });

    it('honors a non-zero starting balance', () => {
      const result = run(
        500,
        [{ date: '2026-01', isTransfer: null, amount: 100 }],
        [],
        '2026-01-01',
        '2026-01-31',
        'Monthly',
      );

      expect(result.balance).toBe(600);
      expect(result.graphData.balances[0].amount).toBe(600);
    });

    it('separates transfers from income/expenses', () => {
      const result = run(
        0,
        [
          { date: '2026-01', isTransfer: null, amount: 1000 },
          { date: '2026-01', isTransfer: 'savings-acct', amount: 500 },
        ],
        [{ date: '2026-01', isTransfer: 'cc-acct', amount: -250 }],
        '2026-01-01',
        '2026-01-31',
        'Monthly',
      );

      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpenses).toBe(0);
      expect(result.totalTransfers).toBe(250);
      expect(result.graphData.transfers[0].y).toBe(250);
      expect(result.balance).toBe(1250);
    });

    it('emits a zero data point for months with no activity', () => {
      const result = run(
        0,
        [{ date: '2026-03', isTransfer: null, amount: 100 }],
        [],
        '2026-01-01',
        '2026-03-31',
        'Monthly',
      );

      expect(result.graphData.income.map(p => p.y)).toEqual([0, 0, 100]);
      expect(result.graphData.balances.map(p => p.amount)).toEqual([0, 0, 100]);
    });
  });

  describe('Daily granularity', () => {
    it('aggregates per-day with daily date keys', () => {
      const result = run(
        0,
        [{ date: '2026-01-02', isTransfer: null, amount: 50 }],
        [{ date: '2026-01-03', isTransfer: null, amount: -20 }],
        '2026-01-01',
        '2026-01-03',
        'Daily',
      );

      expect(result.graphData.income.map(p => p.y)).toEqual([0, 50, 0]);
      expect(result.graphData.expenses.map(p => p.y)).toEqual([0, 0, -20]);
      expect(result.graphData.balances.map(p => p.amount)).toEqual([0, 50, 30]);
    });
  });

  describe('Yearly granularity', () => {
    it('aggregates per-year with year string keys', () => {
      const result = run(
        0,
        [
          { date: '2024', isTransfer: null, amount: 1000 },
          { date: '2025', isTransfer: null, amount: 2000 },
        ],
        [{ date: '2025', isTransfer: null, amount: -500 }],
        '2024-01-01',
        '2025-12-31',
        'Yearly',
      );

      expect(result.totalIncome).toBe(3000);
      expect(result.totalExpenses).toBe(-500);
      expect(result.graphData.income.map(p => p.y)).toEqual([1000, 2000]);
      expect(result.graphData.balances.map(p => p.amount)).toEqual([
        1000, 2500,
      ]);
      expect(result.balance).toBe(2500);
    });
  });

  describe('totalChange', () => {
    it('reports the difference between final and first balance', () => {
      const result = run(
        100,
        [{ date: '2026-02', isTransfer: null, amount: 400 }],
        [],
        '2026-01-01',
        '2026-02-28',
        'Monthly',
      );

      // Jan balance = 100 (no activity), Feb balance = 500.
      expect(result.totalChange).toBe(400);
    });
  });
});
