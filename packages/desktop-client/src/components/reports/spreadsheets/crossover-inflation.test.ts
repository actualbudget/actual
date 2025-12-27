/**
 * Unit tests for inflation calculation logic in crossover spreadsheet.
 *
 * These tests verify the mathematical correctness of inflation adjustments,
 * including:
 * - Conversion from annual to monthly inflation rates
 * - Compound interest calculations over time
 * - Edge cases (zero, null, negative inflation)
 * - Long-term precision and accuracy
 *
 * The tests demonstrate why compound interest formulas are necessary
 * (vs. simple division) for accurate inflation modeling.
 *
 * @module crossover-inflation.test
 */

import { describe, it, expect } from 'vitest';

/**
 * Unit tests for inflation calculation logic in crossover spreadsheet
 */
describe('Crossover Inflation Calculations', () => {
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
