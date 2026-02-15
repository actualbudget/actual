import { describe, expect, it } from 'vitest';

import {
  calculateAgeOfMoney,
  calculateAverageAge,
  calculateGraphData,
  calculateTrend,
  classifyTransactions,
  formatPeriodLabel,
  type Transaction,
  type TransactionWithCategory,
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

  describe('classifyTransactions', () => {
    it('classifies positive amount with income category as income', () => {
      const transactions: TransactionWithCategory[] = [
        { id: '1', date: '2024-01-01', amount: 1000, categoryIsIncome: true },
      ];

      const { income, expenses } = classifyTransactions(transactions);

      expect(income).toHaveLength(1);
      expect(income[0].amount).toBe(1000);
      expect(expenses).toHaveLength(0);
    });

    it('classifies positive amount without income category (refund) as income', () => {
      const transactions: TransactionWithCategory[] = [
        // This is a refund - positive amount but NOT an income category
        // For AoM purposes, refunds are treated as income (money entering your pool)
        { id: '1', date: '2024-01-15', amount: 50, categoryIsIncome: false },
      ];

      const { income, expenses } = classifyTransactions(transactions);

      expect(income).toHaveLength(1);
      expect(income[0].amount).toBe(50);
      expect(expenses).toHaveLength(0);
    });

    it('classifies negative amount as expense regardless of category', () => {
      const transactions: TransactionWithCategory[] = [
        { id: '1', date: '2024-01-10', amount: -200, categoryIsIncome: false },
      ];

      const { income, expenses } = classifyTransactions(transactions);

      expect(income).toHaveLength(0);
      expect(expenses).toHaveLength(1);
      expect(expenses[0].amount).toBe(-200);
    });

    it('correctly separates mixed transactions', () => {
      const transactions: TransactionWithCategory[] = [
        // Salary - income category
        { id: '1', date: '2024-01-01', amount: 3000, categoryIsIncome: true },
        // Groceries - expense
        { id: '2', date: '2024-01-05', amount: -150, categoryIsIncome: false },
        // Refund from store - positive but NOT income category (still income for AoM)
        { id: '3', date: '2024-01-10', amount: 25, categoryIsIncome: false },
        // Freelance work - income category
        { id: '4', date: '2024-01-15', amount: 500, categoryIsIncome: true },
        // Rent - expense
        { id: '5', date: '2024-01-20', amount: -1200, categoryIsIncome: false },
      ];

      const { income, expenses } = classifyTransactions(transactions);

      // All positive amounts are income (including refunds)
      expect(income).toHaveLength(3);
      expect(income.map(t => t.id)).toEqual(['1', '3', '4']);

      // Only negative amounts are expenses
      expect(expenses).toHaveLength(2);
      expect(expenses.map(t => t.id)).toEqual(['2', '5']);
    });

    it('handles uncategorized transactions based on amount sign', () => {
      const transactions: TransactionWithCategory[] = [
        { id: '1', date: '2024-01-01', amount: 100, categoryIsIncome: null },
        { id: '2', date: '2024-01-02', amount: -50, categoryIsIncome: null },
      ];

      const { income, expenses } = classifyTransactions(transactions);

      // Positive amount = income, negative = expense (regardless of category)
      expect(income).toHaveLength(1);
      expect(income[0].id).toBe('1');
      expect(expenses).toHaveLength(1);
      expect(expenses[0].id).toBe('2');
    });

    it('demonstrates refund impact on Age of Money calculation', () => {
      // Scenario: $1000 income on Jan 1, $50 refund on Jan 5, $200 expense on Jan 15
      // The refund ADDS to the income pool as a new bucket
      const transactions: TransactionWithCategory[] = [
        { id: '1', date: '2024-01-01', amount: 1000, categoryIsIncome: true },
        { id: '2', date: '2024-01-05', amount: 50, categoryIsIncome: false }, // Refund
        { id: '3', date: '2024-01-15', amount: -200, categoryIsIncome: false },
      ];

      const { income, expenses } = classifyTransactions(transactions);

      // Refund is classified as income
      expect(income).toHaveLength(2);
      expect(income.map(t => t.id)).toEqual(['1', '2']);

      // Only the negative transaction is an expense
      expect(expenses).toHaveLength(1);
      expect(expenses[0].id).toBe('3');

      // Calculate age using the properly classified transactions
      const result = calculateAgeOfMoney(income, expenses);

      // The $200 expense on Jan 15 draws from the oldest income (Jan 1)
      // Age = Jan 15 - Jan 1 = 14 days
      expect(result.ages).toHaveLength(1);
      expect(result.ages[0].date).toBe('2024-01-15');
      expect(result.ages[0].age).toBe(14);
    });
  });

  describe('formatPeriodLabel', () => {
    it('includes year for daily granularity to avoid duplicates across years', () => {
      // The same calendar day in different years must produce different labels,
      // otherwise recharts highlights the wrong dot (first occurrence)
      const label2024 = formatPeriodLabel('2024-03-15', 'daily');
      const label2025 = formatPeriodLabel('2025-03-15', 'daily');

      expect(label2024).not.toBe(label2025);
    });

    it('includes year for weekly granularity to avoid duplicates across years', () => {
      const label2024 = formatPeriodLabel('2024-03-11', 'weekly');
      const label2025 = formatPeriodLabel('2025-03-10', 'weekly');

      expect(label2024).not.toBe(label2025);
    });

    it('includes year for monthly granularity', () => {
      const label = formatPeriodLabel('2024-03', 'monthly');

      expect(label).toContain('2024');
    });
  });

  describe('calculateGraphData - multi-year daily', () => {
    it('produces unique date labels across years with daily granularity', () => {
      // Create ages spanning two years with the same calendar day
      const ages = [
        { date: '2024-03-15', age: 30 },
        { date: '2025-03-15', age: 45 },
      ];

      const graphData = calculateGraphData(ages, '2024-03', '2025-03', 'daily');

      // Find all entries for March 15 in different years
      const mar15entries = graphData.filter(d => d.date.includes('Mar 15'));

      // There should be exactly 2 entries for Mar 15 (one per year)
      expect(mar15entries).toHaveLength(2);

      // And they must have DIFFERENT date labels (otherwise recharts highlights wrong dot)
      expect(mar15entries[0].date).not.toBe(mar15entries[1].date);
    });

    it('does not produce duplicate date labels in daily mode over 2 years', () => {
      // Generate ages for the same day in two consecutive years
      const ages = [
        { date: '2024-06-01', age: 20 },
        { date: '2024-12-15', age: 25 },
        { date: '2025-06-01', age: 35 },
      ];

      const graphData = calculateGraphData(ages, '2024-06', '2025-06', 'daily');

      // Check that all date labels are unique
      const dateLabels = graphData.map(d => d.date);
      const uniqueLabels = new Set(dateLabels);
      expect(uniqueLabels.size).toBe(dateLabels.length);
    });
  });
});
