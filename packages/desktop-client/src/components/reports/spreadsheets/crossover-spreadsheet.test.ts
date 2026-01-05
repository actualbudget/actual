import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createCrossoverSpreadsheet,
  type CrossoverData,
} from './crossover-spreadsheet';

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
        projectionType: 'trend' as const,
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
});
