import { describe, expect, it } from 'vitest';

import {
  calculateAgeOfMoney,
  calculateAverageAge,
  calculateTrend,
  type Transaction,
} from './age-of-money-spreadsheet';

describe('Age of Money calculations', () => {
  describe('calculateAgeOfMoney', () => {
    it('calculates age correctly with simple FIFO matching', () => {
      const income: Transaction[] = [
        { id: '1', date: '2024-01-01', amount: 1000 },
      ];
      const expenses: Transaction[] = [
        { id: '2', date: '2024-01-15', amount: -500 },
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(1);
      expect(result.ages[0].age).toBe(14); // 14 days between Jan 1 and Jan 15
      expect(result.insufficientData).toBe(false);
    });

    it('uses FIFO order - oldest income first', () => {
      const income: Transaction[] = [
        { id: '1', date: '2024-01-01', amount: 500 },
        { id: '2', date: '2024-01-15', amount: 500 },
      ];
      const expenses: Transaction[] = [
        { id: '3', date: '2024-02-01', amount: -400 },
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(1);
      // Should use Jan 1 income (oldest), so age is 31 days
      expect(result.ages[0].age).toBe(31);
    });

    it('spans multiple income buckets for large expenses', () => {
      const income: Transaction[] = [
        { id: '1', date: '2024-01-01', amount: 200 },
        { id: '2', date: '2024-01-15', amount: 300 },
      ];
      const expenses: Transaction[] = [
        { id: '3', date: '2024-02-01', amount: -400 },
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(1);
      // Expense spans both buckets, uses last bucket date (Jan 15)
      // Age = Feb 1 - Jan 15 = 17 days
      expect(result.ages[0].age).toBe(17);
    });

    it('handles multiple expenses consuming buckets sequentially', () => {
      const income: Transaction[] = [
        { id: '1', date: '2024-01-01', amount: 1000 },
      ];
      const expenses: Transaction[] = [
        { id: '2', date: '2024-01-10', amount: -300 },
        { id: '3', date: '2024-01-20', amount: -300 },
        { id: '4', date: '2024-01-30', amount: -300 },
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(3);
      expect(result.ages[0].age).toBe(9); // Jan 10 - Jan 1
      expect(result.ages[1].age).toBe(19); // Jan 20 - Jan 1
      expect(result.ages[2].age).toBe(29); // Jan 30 - Jan 1
      expect(result.insufficientData).toBe(false);
    });

    it('flags insufficient data when expenses exceed income', () => {
      const income: Transaction[] = [
        { id: '1', date: '2024-01-01', amount: 100 },
      ];
      const expenses: Transaction[] = [
        { id: '2', date: '2024-01-15', amount: -500 },
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.insufficientData).toBe(true);
    });

    it('returns empty ages array when no income', () => {
      const income: Transaction[] = [];
      const expenses: Transaction[] = [
        { id: '1', date: '2024-01-15', amount: -500 },
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(0);
      expect(result.insufficientData).toBe(true);
    });

    it('returns empty ages array when no expenses', () => {
      const income: Transaction[] = [
        { id: '1', date: '2024-01-01', amount: 1000 },
      ];
      const expenses: Transaction[] = [];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(0);
      expect(result.insufficientData).toBe(false);
    });

    it('handles income and expenses on the same day (age = 0)', () => {
      const income: Transaction[] = [
        { id: '1', date: '2024-01-15', amount: 1000 },
      ];
      const expenses: Transaction[] = [
        { id: '2', date: '2024-01-15', amount: -500 },
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(1);
      expect(result.ages[0].age).toBe(0);
    });

    it('sorts transactions by date regardless of input order', () => {
      const income: Transaction[] = [
        { id: '2', date: '2024-01-15', amount: 500 },
        { id: '1', date: '2024-01-01', amount: 500 }, // Earlier but listed second
      ];
      const expenses: Transaction[] = [
        { id: '4', date: '2024-02-15', amount: -200 },
        { id: '3', date: '2024-02-01', amount: -200 }, // Earlier but listed second
      ];

      const result = calculateAgeOfMoney(income, expenses);

      expect(result.ages).toHaveLength(2);
      // First expense (Feb 1) should use Jan 1 income
      expect(result.ages[0].date).toBe('2024-02-01');
      expect(result.ages[0].age).toBe(31);
      // Second expense (Feb 15) should continue from Jan 1 income
      expect(result.ages[1].date).toBe('2024-02-15');
      expect(result.ages[1].age).toBe(45);
    });
  });

  describe('calculateAverageAge', () => {
    it('returns null for empty array', () => {
      const result = calculateAverageAge([]);
      expect(result).toBeNull();
    });

    it('calculates average of all ages when less than count', () => {
      const ages = [
        { date: '2024-01-01', age: 10 },
        { date: '2024-01-02', age: 20 },
        { date: '2024-01-03', age: 30 },
      ];

      const result = calculateAverageAge(ages, 10);

      expect(result).toBe(20); // (10 + 20 + 30) / 3 = 20
    });

    it('calculates average of last N ages when more than count', () => {
      const ages = [
        { date: '2024-01-01', age: 5 },
        { date: '2024-01-02', age: 10 },
        { date: '2024-01-03', age: 15 },
        { date: '2024-01-04', age: 20 },
        { date: '2024-01-05', age: 25 },
      ];

      const result = calculateAverageAge(ages, 3);

      expect(result).toBe(20); // (15 + 20 + 25) / 3 = 20
    });

    it('rounds the result to nearest integer', () => {
      const ages = [
        { date: '2024-01-01', age: 10 },
        { date: '2024-01-02', age: 11 },
      ];

      const result = calculateAverageAge(ages, 10);

      expect(result).toBe(11); // (10 + 11) / 2 = 10.5, rounded to 11
    });

    it('uses default count of 10', () => {
      const ages = Array.from({ length: 15 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        age: (i + 1) * 10,
      }));

      const result = calculateAverageAge(ages);

      // Last 10 ages: 60, 70, 80, 90, 100, 110, 120, 130, 140, 150
      // Average: 105
      expect(result).toBe(105);
    });
  });

  describe('calculateTrend', () => {
    it('returns stable for empty data', () => {
      const result = calculateTrend([]);
      expect(result).toBe('stable');
    });

    it('returns stable for single data point', () => {
      const result = calculateTrend([{ date: 'Jan 2024', ageOfMoney: 30 }]);
      expect(result).toBe('stable');
    });

    it('returns up when age increased by more than threshold', () => {
      const data = [
        { date: 'Jan 2024', ageOfMoney: 20 },
        { date: 'Feb 2024', ageOfMoney: 25 },
      ];

      const result = calculateTrend(data);

      expect(result).toBe('up');
    });

    it('returns down when age decreased by more than threshold', () => {
      const data = [
        { date: 'Jan 2024', ageOfMoney: 30 },
        { date: 'Feb 2024', ageOfMoney: 25 },
      ];

      const result = calculateTrend(data);

      expect(result).toBe('down');
    });

    it('returns stable when change is within threshold', () => {
      const data = [
        { date: 'Jan 2024', ageOfMoney: 30 },
        { date: 'Feb 2024', ageOfMoney: 31 },
      ];

      const result = calculateTrend(data);

      expect(result).toBe('stable'); // Threshold is 2, diff is 1
    });

    it('uses only the last two data points', () => {
      const data = [
        { date: 'Jan 2024', ageOfMoney: 10 },
        { date: 'Feb 2024', ageOfMoney: 50 },
        { date: 'Mar 2024', ageOfMoney: 30 },
        { date: 'Apr 2024', ageOfMoney: 35 },
      ];

      const result = calculateTrend(data);

      // Only compares Apr (35) to Mar (30), diff = 5 > 2
      expect(result).toBe('up');
    });
  });
});
