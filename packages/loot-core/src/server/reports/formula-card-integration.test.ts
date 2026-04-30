import { HyperFormula } from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';
import { beforeEach, describe, expect, it } from 'vitest';

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  CustomFunctionsPlugin,
  customFunctionsTranslations,
} from '#server/rules/customFunctions';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import { q } from '#shared/query';

// Integration tests for formula cards with real database queries
// These tests validate formulas with actual query results from the database

// Register HyperFormula language and plugins if not already registered
try {
  HyperFormula.registerLanguage('enUS', enUS);
} catch {
  // Already registered, ignore
}

try {
  HyperFormula.registerFunctionPlugin(
    CustomFunctionsPlugin,
    customFunctionsTranslations,
  );
} catch {
  // Already registered, ignore
}

beforeEach(async () => {
  // oxlint-disable-next-line typescript/no-explicit-any
  await (global as any).emptyDatabase()();
  await loadMappings();
});

describe('Formula Card - Integration Tests with Queries', () => {
  // Helper functions using db helper methods
  async function createTestAccount(name: string) {
    return await db.insertAccount({ name });
  }

  async function createCategoryGroup(name: string) {
    return await db.insertCategoryGroup({ name });
  }

  async function createTestCategory(
    name: string,
    groupId: string,
    isIncome = false,
  ) {
    return await db.insertCategory({
      name,
      cat_group: groupId,
      is_income: isIncome ? 1 : 0,
    });
  }

  async function createTestTransaction(data: {
    accountId: string;
    amount: number;
    date: string;
    categoryId?: string;
    notes?: string;
  }) {
    return await db.insertTransaction({
      account: data.accountId,
      amount: data.amount,
      date: data.date,
      category: data.categoryId || null,
      notes: data.notes || null,
    });
  }

  async function executeQuery(
    conditions: unknown[],
    timeFrame?: { start?: string; end?: string },
  ) {
    // Simulate query execution like the formula card does
    const { filters } = conditionsToAQL(conditions);

    let transQuery = q('transactions');

    if (timeFrame?.start && timeFrame?.end) {
      transQuery = transQuery.filter({
        $and: [
          { date: { $gte: timeFrame.start } },
          { date: { $lte: timeFrame.end } },
        ],
      });
    }

    if (filters.length > 0) {
      transQuery = transQuery.filter({ $and: filters });
    }

    const summedQuery = transQuery.calculate({ $sum: '$amount' });
    const { data } = await aqlQuery(summedQuery);
    return data || 0;
  }

  async function executeFormulaWithQuery(
    formula: string,
    queryResults: Record<string, number>,
  ) {
    let hfInstance: ReturnType<typeof HyperFormula.buildEmpty> | null = null;

    try {
      hfInstance = HyperFormula.buildEmpty({
        licenseKey: 'gpl-v3',
        language: 'enUS',
        dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'],
      });

      const sheetName = hfInstance.addSheet('Sheet1');
      const sheetId = hfInstance.getSheetId(sheetName);

      if (sheetId === undefined) {
        throw new Error('Failed to create sheet');
      }

      // Replace QUERY() calls with actual values
      let processedFormula = formula;
      for (const [queryName, value] of Object.entries(queryResults)) {
        const regex = new RegExp(
          `QUERY\\s*\\(\\s*["']${queryName}["']\\s*\\)`,
          'gi',
        );
        // Convert cents to dollars for display
        const dollarValue = value / 100;
        processedFormula = processedFormula.replace(regex, String(dollarValue));
      }

      hfInstance.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [
        [processedFormula],
      ]);

      const cellValue = hfInstance.getCellValue({
        sheet: sheetId,
        col: 0,
        row: 0,
      });

      if (cellValue && typeof cellValue === 'object' && 'type' in cellValue) {
        throw new Error(`Formula error: ${cellValue.type}`);
      }

      return cellValue;
    } finally {
      hfInstance?.destroy();
    }
  }

  describe('Basic Query Integration', () => {
    it('should execute formula with single query result', async () => {
      // Integration test: Simple query sum with formula
      const accountId = await createTestAccount('Checking');
      const groupId = await createCategoryGroup('Expenses');
      const categoryId = await createTestCategory('Groceries', groupId);

      // Create test transactions
      await createTestTransaction({
        accountId,
        amount: -5000,
        date: '2024-01-15',
        categoryId,
      });
      await createTestTransaction({
        accountId,
        amount: -7500,
        date: '2024-01-20',
        categoryId,
      });
      await createTestTransaction({
        accountId,
        amount: -3000,
        date: '2024-01-25',
        categoryId,
      });

      // Execute query
      const queryResult = await executeQuery([
        { field: 'category', op: 'is', value: categoryId, type: 'id' },
      ]);

      // Execute formula with query result
      const formula = '=FORMATCURRENCY(QUERY("Groceries"))';
      const result = await executeFormulaWithQuery(formula, {
        Groceries: queryResult,
      });

      // FORMATCURRENCY places negative sign before currency symbol
      expect(result).toBe('-$155.00');
    });

    it('should calculate percentage from query results', async () => {
      // Integration test: Calculate spending as percentage of income
      const accountId = await createTestAccount('Checking');
      const groupId = await createCategoryGroup('Income');
      const incomeCategory = await createTestCategory('Salary', groupId, true);
      const expenseGroup = await createCategoryGroup('Expenses');
      const expenseCategory = await createTestCategory('Food', expenseGroup);

      // Create income
      await createTestTransaction({
        accountId,
        amount: 500000, // $5000
        date: '2024-01-01',
        categoryId: incomeCategory,
      });

      // Create expenses
      await createTestTransaction({
        accountId,
        amount: -75000, // $750
        date: '2024-01-15',
        categoryId: expenseCategory,
      });

      const incomeResult = await executeQuery([
        { field: 'category', op: 'is', value: incomeCategory, type: 'id' },
      ]);

      const expenseResult = await executeQuery([
        { field: 'category', op: 'is', value: expenseCategory, type: 'id' },
      ]);

      const formula =
        '=CONCATENATE(FORMATNUMBER((ABS(QUERY("Expenses")) / QUERY("Income")) * 100, 1), "%")';
      const result = await executeFormulaWithQuery(formula, {
        Income: incomeResult,
        Expenses: expenseResult,
      });

      expect(result).toBe('15.0%');
    });

    it('should format large query results with thousands separators', async () => {
      // Integration test: Format large numbers from queries
      const accountId = await createTestAccount('Investment');
      const groupId = await createCategoryGroup('Income');
      const categoryId = await createTestCategory('Dividends', groupId, true);

      // Create large transactions
      await createTestTransaction({
        accountId,
        amount: 123456789, // $1,234,567.89
        date: '2024-01-01',
        categoryId,
      });

      const queryResult = await executeQuery([
        { field: 'category', op: 'is', value: categoryId, type: 'id' },
      ]);

      const formula = '=FORMATNUMBER(QUERY("Dividends"), 2)';
      const result = await executeFormulaWithQuery(formula, {
        Dividends: queryResult,
      });

      expect(result).toBe('1,234,567.89');
    });
  });

  describe('Multiple Query Integration', () => {
    it('should combine multiple query results in formula', async () => {
      // Integration test: Calculate net worth from multiple queries
      const checkingId = await createTestAccount('Checking');
      const savingsId = await createTestAccount('Savings');
      const creditCardId = await createTestAccount('Credit Card');

      // Create transactions
      await createTestTransaction({
        accountId: checkingId,
        amount: 250000, // $2500
        date: '2024-01-01',
      });
      await createTestTransaction({
        accountId: savingsId,
        amount: 1000000, // $10000
        date: '2024-01-01',
      });
      await createTestTransaction({
        accountId: creditCardId,
        amount: -50000, // -$500
        date: '2024-01-01',
      });

      const checkingResult = await executeQuery([
        { field: 'account', op: 'is', value: checkingId, type: 'id' },
      ]);

      const savingsResult = await executeQuery([
        { field: 'account', op: 'is', value: savingsId, type: 'id' },
      ]);

      const creditCardResult = await executeQuery([
        { field: 'account', op: 'is', value: creditCardId, type: 'id' },
      ]);

      const formula =
        '=FORMATCURRENCY(QUERY("Checking") + QUERY("Savings") + QUERY("CreditCard"))';
      const result = await executeFormulaWithQuery(formula, {
        Checking: checkingResult,
        Savings: savingsResult,
        CreditCard: creditCardResult,
      });

      // Query results: 250000 + 1000000 - 50000 = 1200000 cents = 12000 dollars
      expect(result).toBe('$12,000.00');
    });

    it('should calculate ratios between multiple queries', async () => {
      // Integration test: Calculate savings rate
      const accountId = await createTestAccount('Checking');
      const incomeGroup = await createCategoryGroup('Income');
      const incomeCategory = await createTestCategory(
        'Salary',
        incomeGroup,
        true,
      );
      const savingsGroup = await createCategoryGroup('Savings');
      const savingsCategory = await createTestCategory('Savings', savingsGroup);

      await createTestTransaction({
        accountId,
        amount: 600000, // $6000 income
        date: '2024-01-01',
        categoryId: incomeCategory,
      });

      await createTestTransaction({
        accountId,
        amount: -120000, // $1200 savings
        date: '2024-01-15',
        categoryId: savingsCategory,
      });

      const incomeResult = await executeQuery([
        { field: 'category', op: 'is', value: incomeCategory, type: 'id' },
      ]);

      const savingsResult = await executeQuery([
        { field: 'category', op: 'is', value: savingsCategory, type: 'id' },
      ]);

      const formula =
        '=CONCATENATE("Savings Rate: ", FORMATNUMBER((ABS(QUERY("Savings")) / QUERY("Income")) * 100, 1), "%")';
      const result = await executeFormulaWithQuery(formula, {
        Income: incomeResult,
        Savings: savingsResult,
      });

      expect(result).toBe('Savings Rate: 20.0%');
    });
  });

  describe('Complex Nested Formulas with Queries', () => {
    it('should handle deeply nested calculations with multiple queries', async () => {
      // Integration test: Complex budget analysis
      const accountId = await createTestAccount('Checking');
      const incomeGroup = await createCategoryGroup('Income');
      const incomeCategory = await createTestCategory(
        'Salary',
        incomeGroup,
        true,
      );
      const needsGroup = await createCategoryGroup('Needs');
      const needsCategory = await createTestCategory('Housing', needsGroup);
      const wantsGroup = await createCategoryGroup('Wants');
      const wantsCategory = await createTestCategory(
        'Entertainment',
        wantsGroup,
      );

      await createTestTransaction({
        accountId,
        amount: 500000, // $5000 income
        date: '2024-01-01',
        categoryId: incomeCategory,
      });

      await createTestTransaction({
        accountId,
        amount: -200000, // $2000 needs
        date: '2024-01-10',
        categoryId: needsCategory,
      });

      await createTestTransaction({
        accountId,
        amount: -100000, // $1000 wants
        date: '2024-01-15',
        categoryId: wantsCategory,
      });

      const incomeResult = await executeQuery([
        { field: 'category', op: 'is', value: incomeCategory, type: 'id' },
      ]);

      const needsResult = await executeQuery([
        { field: 'category', op: 'is', value: needsCategory, type: 'id' },
      ]);

      const wantsResult = await executeQuery([
        { field: 'category', op: 'is', value: wantsCategory, type: 'id' },
      ]);

      const formula =
        '=CONCATENATE("Income: ", FORMATCURRENCY(QUERY("Income")), " | Needs: ", FORMATNUMBER((ABS(QUERY("Needs")) / QUERY("Income")) * 100, 0), "% | Wants: ", FORMATNUMBER((ABS(QUERY("Wants")) / QUERY("Income")) * 100, 0), "%")';
      const result = await executeFormulaWithQuery(formula, {
        Income: incomeResult,
        Needs: needsResult,
        Wants: wantsResult,
      });

      // Income: 500000 cents = 5000 dollars
      expect(result).toBe('Income: $5,000.00 | Needs: 40% | Wants: 20%');
    });

    it('should use conditional logic with query results', async () => {
      // Integration test: Budget status with IF statements
      const accountId = await createTestAccount('Checking');
      const groupId = await createCategoryGroup('Expenses');
      const categoryId = await createTestCategory('Dining', groupId);

      await createTestTransaction({
        accountId,
        amount: -35000, // $350
        date: '2024-01-15',
        categoryId,
      });

      const queryResult = await executeQuery([
        { field: 'category', op: 'is', value: categoryId, type: 'id' },
      ]);

      const formula =
        '=IF(ABS(QUERY("Dining")) > 400, "Over Budget", IF(ABS(QUERY("Dining")) > 300, "Near Limit", "On Track"))';
      const result = await executeFormulaWithQuery(formula, {
        Dining: queryResult,
      });

      expect(result).toBe('Near Limit');
    });

    it('should create multi-line output with query results', async () => {
      // Integration test: Multi-line summary with CHAR(10)
      const accountId = await createTestAccount('Checking');
      const incomeGroup = await createCategoryGroup('Income');
      const incomeCategory = await createTestCategory(
        'Salary',
        incomeGroup,
        true,
      );
      const expenseGroup = await createCategoryGroup('Expenses');
      const expenseCategory = await createTestCategory('Total', expenseGroup);

      await createTestTransaction({
        accountId,
        amount: 400000, // $4000
        date: '2024-01-01',
        categoryId: incomeCategory,
      });

      await createTestTransaction({
        accountId,
        amount: -150000, // $1500
        date: '2024-01-15',
        categoryId: expenseCategory,
      });

      const incomeResult = await executeQuery([
        { field: 'category', op: 'is', value: incomeCategory, type: 'id' },
      ]);

      const expenseResult = await executeQuery([
        { field: 'category', op: 'is', value: expenseCategory, type: 'id' },
      ]);

      const formula =
        '=CONCATENATE("Income: ", FORMATCURRENCY(QUERY("Income")), CHAR(10), "Expenses: ", FORMATCURRENCY(QUERY("Expenses")), CHAR(10), "Net: ", FORMATCURRENCY(QUERY("Income") + QUERY("Expenses")))';
      const result = await executeFormulaWithQuery(formula, {
        Income: incomeResult,
        Expenses: expenseResult,
      });

      // Income: 400000 cents = 4000 dollars, Expenses: -150000 cents = -1500 dollars
      expect(result).toContain('Income: $4,000.00');
      expect(result).toContain('\n');
      expect(result).toContain('Expenses: -$1,500.00');
      expect(result).toContain('Net: $2,500.00');
    });
  });

  describe('Date-based Query Integration', () => {
    it('should filter queries by date range', async () => {
      // Integration test: Query with time frame
      const accountId = await createTestAccount('Checking');
      const groupId = await createCategoryGroup('Expenses');
      const categoryId = await createTestCategory('Shopping', groupId);

      // Transactions in different months
      await createTestTransaction({
        accountId,
        amount: -10000,
        date: '2024-01-15',
        categoryId,
      });
      await createTestTransaction({
        accountId,
        amount: -15000,
        date: '2024-02-15',
        categoryId,
      });
      await createTestTransaction({
        accountId,
        amount: -20000,
        date: '2024-03-15',
        categoryId,
      });

      // Query only January
      const queryResult = await executeQuery(
        [{ field: 'category', op: 'is', value: categoryId, type: 'id' }],
        { start: '2024-01-01', end: '2024-01-31' },
      );

      const formula = '=FORMATCURRENCY(QUERY("Shopping"))';
      const result = await executeFormulaWithQuery(formula, {
        Shopping: queryResult,
      });

      // Query result: -10000 cents = -100 dollars
      expect(result).toBe('-$100.00');
    });

    it('should compare different time periods', async () => {
      // Integration test: Month-over-month comparison
      const accountId = await createTestAccount('Checking');
      const groupId = await createCategoryGroup('Expenses');
      const categoryId = await createTestCategory('Utilities', groupId);

      await createTestTransaction({
        accountId,
        amount: -12000,
        date: '2024-01-15',
        categoryId,
      });
      await createTestTransaction({
        accountId,
        amount: -15000,
        date: '2024-02-15',
        categoryId,
      });

      const jan = await executeQuery(
        [{ field: 'category', op: 'is', value: categoryId, type: 'id' }],
        { start: '2024-01-01', end: '2024-01-31' },
      );

      const feb = await executeQuery(
        [{ field: 'category', op: 'is', value: categoryId, type: 'id' }],
        { start: '2024-02-01', end: '2024-02-29' },
      );

      const formula =
        '=CONCATENATE("Change: ", FORMATNUMBER(((ABS(QUERY("Feb")) - ABS(QUERY("Jan"))) / ABS(QUERY("Jan"))) * 100, 1), "%")';
      const result = await executeFormulaWithQuery(formula, {
        Jan: jan,
        Feb: feb,
      });

      expect(result).toBe('Change: 25.0%');
    });
  });

  describe('Error Handling with Queries', () => {
    it('should handle empty query results', async () => {
      // Integration test: Query with no matching transactions
      const groupId = await createCategoryGroup('Expenses');
      const categoryId = await createTestCategory('Empty', groupId);

      // No transactions created for this category

      const queryResult = await executeQuery([
        { field: 'category', op: 'is', value: categoryId, type: 'id' },
      ]);

      const formula = '=FORMATCURRENCY(QUERY("Empty"))';
      const result = await executeFormulaWithQuery(formula, {
        Empty: queryResult,
      });

      expect(result).toBe('$0.00');
    });

    it('should handle division by zero with IFERROR', async () => {
      // Integration test: Safe division with empty query
      const accountId = await createTestAccount('Checking');
      const groupId = await createCategoryGroup('Income');
      const incomeCategory = await createTestCategory('Salary', groupId, true);
      const expenseGroup = await createCategoryGroup('Expenses');
      const expenseCategory = await createTestCategory('Food', expenseGroup);

      // Only create expense, no income
      await createTestTransaction({
        accountId,
        amount: -10000,
        date: '2024-01-15',
        categoryId: expenseCategory,
      });

      const incomeResult = await executeQuery([
        { field: 'category', op: 'is', value: incomeCategory, type: 'id' },
      ]);

      const expenseResult = await executeQuery([
        { field: 'category', op: 'is', value: expenseCategory, type: 'id' },
      ]);

      const formula =
        '=IFERROR(CONCATENATE(FORMATNUMBER((ABS(QUERY("Expenses")) / QUERY("Income")) * 100, 0), "%"), "No Income")';
      const result = await executeFormulaWithQuery(formula, {
        Income: incomeResult,
        Expenses: expenseResult,
      });

      expect(result).toBe('No Income');
    });
  });

  describe('Advanced Query Scenarios', () => {
    it('should calculate running totals across accounts', async () => {
      // Integration test: Net worth calculation
      const checking = await createTestAccount('Checking');
      const savings = await createTestAccount('Savings');
      const investment = await createTestAccount('Investment');
      const creditCard = await createTestAccount('Credit Card');

      await createTestTransaction({
        accountId: checking,
        amount: 150000,
        date: '2024-01-01',
      });
      await createTestTransaction({
        accountId: savings,
        amount: 500000,
        date: '2024-01-01',
      });
      await createTestTransaction({
        accountId: investment,
        amount: 1000000,
        date: '2024-01-01',
      });
      await createTestTransaction({
        accountId: creditCard,
        amount: -25000,
        date: '2024-01-01',
      });

      const checkingResult = await executeQuery([
        { field: 'account', op: 'is', value: checking, type: 'id' },
      ]);
      const savingsResult = await executeQuery([
        { field: 'account', op: 'is', value: savings, type: 'id' },
      ]);
      const investmentResult = await executeQuery([
        { field: 'account', op: 'is', value: investment, type: 'id' },
      ]);
      const creditCardResult = await executeQuery([
        { field: 'account', op: 'is', value: creditCard, type: 'id' },
      ]);

      const formula =
        '=FORMATCURRENCY(QUERY("Checking") + QUERY("Savings") + QUERY("Investment") + QUERY("CreditCard"))';
      const result = await executeFormulaWithQuery(formula, {
        Checking: checkingResult,
        Savings: savingsResult,
        Investment: investmentResult,
        CreditCard: creditCardResult,
      });

      expect(result).toBe('$16,250.00');
    });

    it('should use MAX and MIN with query results', async () => {
      // Integration test: Find highest spending category
      const accountId = await createTestAccount('Checking');
      const groupId = await createCategoryGroup('Expenses');
      const cat1 = await createTestCategory('Category1', groupId);
      const cat2 = await createTestCategory('Category2', groupId);
      const cat3 = await createTestCategory('Category3', groupId);

      await createTestTransaction({
        accountId,
        amount: -15000,
        date: '2024-01-15',
        categoryId: cat1,
      });
      await createTestTransaction({
        accountId,
        amount: -25000,
        date: '2024-01-15',
        categoryId: cat2,
      });
      await createTestTransaction({
        accountId,
        amount: -10000,
        date: '2024-01-15',
        categoryId: cat3,
      });

      const result1 = await executeQuery([
        { field: 'category', op: 'is', value: cat1, type: 'id' },
      ]);
      const result2 = await executeQuery([
        { field: 'category', op: 'is', value: cat2, type: 'id' },
      ]);
      const result3 = await executeQuery([
        { field: 'category', op: 'is', value: cat3, type: 'id' },
      ]);

      const formula =
        '=CONCATENATE("Highest: ", FORMATCURRENCY(MIN(QUERY("Cat1"), QUERY("Cat2"), QUERY("Cat3"))))';
      const result = await executeFormulaWithQuery(formula, {
        Cat1: result1,
        Cat2: result2,
        Cat3: result3,
      });

      // MIN of -150, -250, -100 = -250 dollars
      expect(result).toBe('Highest: -$250.00');
    });
  });
});
