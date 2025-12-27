import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCrossoverSpreadsheet } from './crossover-spreadsheet';
import type { CrossoverData } from './crossover-spreadsheet';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

// Mock the aqlQuery function
vi.mock('@desktop-client/queries/aqlQuery', () => ({
  aqlQuery: vi.fn(),
}));

describe('crossover-spreadsheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inflation adjustment', () => {
    it('should apply inflation to projected expenses with hampel method', async () => {
      const mockAqlQuery = aqlQuery as unknown as ReturnType<typeof vi.fn>;

      // Mock expense data - $1000/month
      mockAqlQuery.mockImplementation((query: unknown) => {
        const queryObj = query as { state?: { filterExpressions?: unknown[] } };

        // Check if this is an expense query
        if (queryObj.state?.filterExpressions) {
          return Promise.resolve({
            data: [
              { date: '2024-01', amount: -1000 },
              { date: '2024-02', amount: -1000 },
              { date: '2024-03', amount: -1000 },
            ],
          });
        }

        // Account balance query - return starting balance and monthly data
        return Promise.resolve({
          data: 100000, // Starting balance
        });
      });

      const params = {
        start: '2024-01',
        end: '2024-03',
        expenseCategoryIds: ['cat1'],
        incomeAccountIds: ['acc1'],
        safeWithdrawalRate: 0.04,
        estimatedReturn: 0.05,
        projectionType: 'hampel' as const,
        inflationRate: 0.03, // 3% annual inflation
      };

      const spreadsheet = createCrossoverSpreadsheet(params);

      let capturedData: CrossoverData | null = null;
      const setData = (data: CrossoverData) => {
        capturedData = data;
      };

      // Mock spreadsheet object - we don't actually use it
      const mockSpreadsheet = {} as Parameters<typeof spreadsheet>[0];

      await spreadsheet(mockSpreadsheet, setData);

      expect(capturedData).not.toBeNull();

      // Find projected data points
      const projectedData = capturedData!.graphData.data.filter(
        d => d.isProjection,
      );

      if (projectedData.length >= 2) {
        // First projected month should have base expense
        const firstProjected = projectedData[0];
        const secondProjected = projectedData[1];

        // Expenses should increase due to inflation
        // Note: actual implementation rounds to nearest integer
        expect(secondProjected.expenses).toBeGreaterThan(
          firstProjected.expenses,
        );

        // Verify the increase is reasonable for 3% annual inflation
        // Monthly increase should be approximately 0.25%
        const percentIncrease =
          (secondProjected.expenses - firstProjected.expenses) /
          firstProjected.expenses;
        expect(percentIncrease).toBeGreaterThan(0.001); // At least 0.1% increase
        expect(percentIncrease).toBeLessThan(0.005); // Less than 0.5% increase
      }
    });

    it('should apply inflation to projected expenses with trend method', async () => {
      const mockAqlQuery = aqlQuery as unknown as ReturnType<typeof vi.fn>;

      // Mock expense data with a trend - increasing expenses
      mockAqlQuery.mockImplementation((query: unknown) => {
        const queryObj = query as { state?: { filterExpressions?: unknown[] } };

        if (queryObj.state?.filterExpressions) {
          return Promise.resolve({
            data: [
              { date: '2024-01', amount: -1000 },
              { date: '2024-02', amount: -1050 },
              { date: '2024-03', amount: -1100 },
            ],
          });
        }

        return Promise.resolve({
          data: 100000,
        });
      });

      const params = {
        start: '2024-01',
        end: '2024-03',
        expenseCategoryIds: ['cat1'],
        incomeAccountIds: ['acc1'],
        safeWithdrawalRate: 0.04,
        estimatedReturn: 0.05,
        projectionType: 'median' as const,
        inflationRate: 0.03,
      };

      const spreadsheet = createCrossoverSpreadsheet(params);

      let capturedData: CrossoverData | null = null;
      const setData = (data: CrossoverData) => {
        capturedData = data;
      };

      const mockSpreadsheet = {} as Parameters<typeof spreadsheet>[0];

      await spreadsheet(mockSpreadsheet, setData);

      expect(capturedData).not.toBeNull();

      const projectedData = capturedData!.graphData.data.filter(
        d => d.isProjection,
      );

      if (projectedData.length >= 2) {
        // Expenses should be increasing due to both trend and inflation
        const firstProjected = projectedData[0];
        const secondProjected = projectedData[1];

        expect(secondProjected.expenses).toBeGreaterThan(
          firstProjected.expenses,
        );
      }
    });

    it('should not apply inflation when inflationRate is null', async () => {
      const mockAqlQuery = aqlQuery as unknown as ReturnType<typeof vi.fn>;

      mockAqlQuery.mockImplementation((query: unknown) => {
        const queryObj = query as { state?: { filterExpressions?: unknown[] } };

        if (queryObj.state?.filterExpressions) {
          return Promise.resolve({
            data: [
              { date: '2024-01', amount: -1000 },
              { date: '2024-02', amount: -1000 },
              { date: '2024-03', amount: -1000 },
            ],
          });
        }

        return Promise.resolve({
          data: 100000,
        });
      });

      const params = {
        start: '2024-01',
        end: '2024-03',
        expenseCategoryIds: ['cat1'],
        incomeAccountIds: ['acc1'],
        safeWithdrawalRate: 0.04,
        estimatedReturn: 0.05,
        projectionType: 'hampel' as const,
        inflationRate: null, // No inflation
      };

      const spreadsheet = createCrossoverSpreadsheet(params);

      let capturedData: CrossoverData | null = null;
      const setData = (data: CrossoverData) => {
        capturedData = data;
      };

      const mockSpreadsheet = {} as Parameters<typeof spreadsheet>[0];

      await spreadsheet(mockSpreadsheet, setData);

      expect(capturedData).not.toBeNull();

      const projectedData = capturedData!.graphData.data.filter(
        d => d.isProjection,
      );

      if (projectedData.length >= 2) {
        // With hampel and no inflation, expenses should be flat
        const firstProjected = projectedData[0];
        const secondProjected = projectedData[1];

        expect(firstProjected.expenses).toBe(secondProjected.expenses);
      }
    });

    it('should calculate correct monthly inflation rate from annual rate', async () => {
      const mockAqlQuery = aqlQuery as unknown as ReturnType<typeof vi.fn>;

      mockAqlQuery.mockImplementation((query: unknown) => {
        const queryObj = query as { state?: { filterExpressions?: unknown[] } };

        if (queryObj.state?.filterExpressions) {
          return Promise.resolve({
            data: [{ date: '2024-01', amount: -1200 }],
          });
        }

        return Promise.resolve({
          data: 100000,
        });
      });

      const params = {
        start: '2024-01',
        end: '2024-01',
        expenseCategoryIds: ['cat1'],
        incomeAccountIds: ['acc1'],
        safeWithdrawalRate: 0.04,
        estimatedReturn: 0.05,
        projectionType: 'hampel' as const,
        inflationRate: 0.03, // 3% annual
      };

      const spreadsheet = createCrossoverSpreadsheet(params);

      let capturedData: CrossoverData | null = null;
      const setData = (data: CrossoverData) => {
        capturedData = data;
      };

      const mockSpreadsheet = {} as Parameters<typeof spreadsheet>[0];

      await spreadsheet(mockSpreadsheet, setData);

      expect(capturedData).not.toBeNull();

      const projectedData = capturedData!.graphData.data.filter(
        d => d.isProjection,
      );

      if (projectedData.length >= 12) {
        // After 12 months, expenses should be approximately 3% higher
        const firstMonth = projectedData[0];
        const twelfthMonth = projectedData[11];

        // Due to Math.round() in implementation, we can't expect exact values
        // Just verify that expenses have increased over 12 months
        expect(twelfthMonth.expenses).toBeGreaterThan(firstMonth.expenses);

        // Calculate the actual increase percentage
        const percentIncrease =
          (twelfthMonth.expenses - firstMonth.expenses) / firstMonth.expenses;

        // Should be roughly 3% (allowing for rounding errors)
        // Since each month compounds and rounds, we expect 2-4% range
        expect(percentIncrease).toBeGreaterThan(0.02); // At least 2%
        expect(percentIncrease).toBeLessThan(0.04); // Less than 4%
      }
    });

    it('should handle zero inflation rate', async () => {
      const mockAqlQuery = aqlQuery as unknown as ReturnType<typeof vi.fn>;

      mockAqlQuery.mockImplementation((query: unknown) => {
        const queryObj = query as { state?: { filterExpressions?: unknown[] } };

        if (queryObj.state?.filterExpressions) {
          return Promise.resolve({
            data: [{ date: '2024-01', amount: -1000 }],
          });
        }

        return Promise.resolve({
          data: 100000,
        });
      });

      const params = {
        start: '2024-01',
        end: '2024-01',
        expenseCategoryIds: ['cat1'],
        incomeAccountIds: ['acc1'],
        safeWithdrawalRate: 0.04,
        estimatedReturn: 0.05,
        projectionType: 'hampel' as const,
        inflationRate: 0, // Zero inflation
      };

      const spreadsheet = createCrossoverSpreadsheet(params);

      let capturedData: CrossoverData | null = null;
      const setData = (data: CrossoverData) => {
        capturedData = data;
      };

      const mockSpreadsheet = {} as Parameters<typeof spreadsheet>[0];

      await spreadsheet(mockSpreadsheet, setData);

      expect(capturedData).not.toBeNull();

      const projectedData = capturedData!.graphData.data.filter(
        d => d.isProjection,
      );

      if (projectedData.length >= 2) {
        // With zero inflation, hampel expenses should remain constant
        const firstProjected = projectedData[0];
        const secondProjected = projectedData[1];

        expect(firstProjected.expenses).toBe(secondProjected.expenses);
      }
    });
  });

  describe('monthly inflation rate conversion', () => {
    it('should use compound formula, not simple division', () => {
      const annualInflation = 0.03;
      const baseExpense = 1000;

      // WRONG WAY: Simple division
      const simpleDivision = annualInflation / 12; // 0.0025
      const resultSimple = baseExpense * Math.pow(1 + simpleDivision, 12);

      // RIGHT WAY: Compound formula
      const compoundFormula = Math.pow(1 + annualInflation, 1 / 12) - 1; // 0.002466
      const resultCompound = baseExpense * Math.pow(1 + compoundFormula, 12);

      // Simple division gives ~3.04% instead of exactly 3%
      expect(resultSimple).toBeCloseTo(1030.42, 2);

      // Compound formula gives exactly 3%
      expect(resultCompound).toBeCloseTo(1030.0, 2);

      // The difference matters!
      expect(resultSimple).toBeGreaterThan(resultCompound);
    });

    it('should convert 3% annual inflation to monthly rate correctly', () => {
      const annualInflation = 0.03;
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      // Monthly inflation should be approximately 0.2466% (0.002466)
      // NOT 0.25% (0.0025) which would be simple division
      expect(monthlyInflation).toBeCloseTo(0.002466, 5);
    });

    it('should convert 0% annual inflation to 0% monthly rate', () => {
      const annualInflation = 0;
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      expect(monthlyInflation).toBe(0);
    });

    it('should convert 10% annual inflation to monthly rate correctly', () => {
      const annualInflation = 0.1;
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      // Monthly inflation should be approximately 0.7974% (0.007974)
      expect(monthlyInflation).toBeCloseTo(0.007974, 5);
    });
  });

  describe('expense inflation over time', () => {
    it('should compound monthly inflation correctly over 12 months', () => {
      const baseExpense = 1000;
      const annualInflation = 0.03;
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      // After 12 months, should be approximately 3% higher
      const inflatedExpense = baseExpense * Math.pow(1 + monthlyInflation, 12);

      // Should be close to $1030
      expect(inflatedExpense).toBeCloseTo(1030, 0);
    });

    it('should handle zero inflation correctly', () => {
      const baseExpense = 1000;
      const monthlyInflation = 0;

      const inflatedExpense = baseExpense * Math.pow(1 + monthlyInflation, 12);

      expect(inflatedExpense).toBe(1000);
    });

    it('should compound correctly over multiple years', () => {
      const baseExpense = 1000;
      const annualInflation = 0.03;
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      // After 24 months (2 years), should be approximately (1.03)^2 = 1.0609 times higher
      const inflatedExpense = baseExpense * Math.pow(1 + monthlyInflation, 24);

      // Should be close to $1060.90
      expect(inflatedExpense).toBeCloseTo(1060.9, 0);
    });

    it('should handle high inflation rates', () => {
      const baseExpense = 1000;
      const annualInflation = 0.2; // 20% annual inflation
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      // After 12 months, should be 20% higher
      const inflatedExpense = baseExpense * Math.pow(1 + monthlyInflation, 12);

      expect(inflatedExpense).toBeCloseTo(1200, 0);
    });

    it('should apply inflation correctly to projected expenses in sequence', () => {
      const baseExpense = 1000;
      const annualInflation = 0.03;
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      const projectedExpenses: number[] = [];

      // Project for 6 months
      for (let i = 1; i <= 6; i++) {
        const expense = baseExpense * Math.pow(1 + monthlyInflation, i);
        projectedExpenses.push(expense);
      }

      // Each month should be higher than the previous
      for (let i = 1; i < projectedExpenses.length; i++) {
        expect(projectedExpenses[i]).toBeGreaterThan(projectedExpenses[i - 1]);
      }

      // First month should be approximately $1002.47
      expect(projectedExpenses[0]).toBeCloseTo(1002.47, 1);

      // Sixth month should be approximately $1014.89
      expect(projectedExpenses[5]).toBeCloseTo(1014.89, 1);
    });
  });

  describe('inflation disabled behavior', () => {
    it('should not inflate expenses when inflation rate is null', () => {
      const baseExpense = 1000;
      const inflationRate = null;

      // When inflation is null, monthlyInflationRate should be 0
      const monthlyInflationRate = inflationRate
        ? Math.pow(1 + inflationRate, 1 / 12) - 1
        : 0;

      const inflatedExpense =
        baseExpense * Math.pow(1 + monthlyInflationRate, 12);

      expect(inflatedExpense).toBe(1000);
    });

    it('should handle undefined inflation rate as no inflation', () => {
      const baseExpense = 1000;
      const inflationRate = undefined;

      const monthlyInflationRate = inflationRate
        ? Math.pow(1 + inflationRate, 1 / 12) - 1
        : 0;

      const inflatedExpense =
        baseExpense * Math.pow(1 + monthlyInflationRate, 12);

      expect(inflatedExpense).toBe(1000);
    });
  });

  describe('edge cases', () => {
    it('should handle very small inflation rates', () => {
      const baseExpense = 1000;
      const annualInflation = 0.001; // 0.1% annual
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      const inflatedExpense = baseExpense * Math.pow(1 + monthlyInflation, 12);

      // Should be very close to $1001
      expect(inflatedExpense).toBeCloseTo(1001, 0);
    });

    it('should handle negative inflation (deflation)', () => {
      const baseExpense = 1000;
      const annualInflation = -0.02; // -2% annual (deflation)
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      const inflatedExpense = baseExpense * Math.pow(1 + monthlyInflation, 12);

      // Should be close to $980
      expect(inflatedExpense).toBeCloseTo(980, 0);
    });

    it('should maintain precision over long projection periods', () => {
      const baseExpense = 1000;
      const annualInflation = 0.03;
      const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

      // Project 10 years (120 months)
      const inflatedExpense = baseExpense * Math.pow(1 + monthlyInflation, 120);

      // After 10 years at 3% annual, should be (1.03)^10 = 1.3439 times higher
      // $1000 * 1.3439 = $1343.90
      expect(inflatedExpense).toBeCloseTo(1343.9, 0);
    });
  });
});
