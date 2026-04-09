import { describe, expect, it, beforeEach } from 'vitest';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';

import {
  insertRule,
  loadRules,
  resetState,
  runRules,
} from '../transactions/transaction-rules';

// Integration tests for formula-based rule actions
// These tests validate formulas with real transaction data and rule execution
// Note: Rules must have conditions on 'imported_payee' or 'payee' to be indexed and executed

beforeEach(async () => {
  await global.emptyDatabase()();
  resetState();
  await loadMappings();
  await loadRules();
});

describe('Formula Rule Actions - Integration Tests', () => {
  describe('Basic Formula Operations', () => {
    it('should calculate percentage of transaction amount with FORMATCURRENCY', async () => {
      // Integration test: Calculate 5% interest on transaction amount
      // Feedback: Users need proper currency formatting
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Bank' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=CONCATENATE("Interest: ", FORMATCURRENCY(amount * 0.05))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 100000, // $1000.00 in cents
        date: '2024-01-01',
        imported_payee: 'Bank Transfer',
        notes: '',
      });

      expect(transaction.notes).toBe('Interest: $5,000.00');
    });

    it('should use nested IF statements with transaction fields', async () => {
      // Integration test: Complex nested IF for categorization
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Store' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=IF(amount > 0, "Income", IF(ABS(amount) > 10000, "Large Expense", IF(ABS(amount) > 5000, "Medium Expense", "Small Expense")))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000, // -$50.00
        date: '2024-01-15',
        imported_payee: 'Store Purchase',
        notes: '',
      });

      expect(transaction.notes).toBe('Small Expense');
    });

    it('should format dates with TEXT function', async () => {
      // Integration test: Format transaction date
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Shop' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Transaction on ", TEXT(date, "MMMM DD, YYYY"))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -2500,
        date: '2024-03-15',
        imported_payee: 'Shop',
        notes: '',
      });

      expect(transaction.notes).toContain('Transaction on');
      expect(transaction.notes).toContain('2024');
    });
  });

  describe('Text Manipulation Functions', () => {
    it('should use CONCATENATE with UPPER and FORMATCURRENCY', async () => {
      // Integration test: Build descriptive notes from multiple fields
      const payeeId = await db.insertPayee({ name: 'Amazon' });

      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: payeeId }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE(UPPER(payee_name), " - ", FORMATCURRENCY(amount / 100), " on ", TEXT(date, "MM/DD/YYYY"))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -15000, // cents
        date: '2024-02-10',
        payee: payeeId,
        payee_name: 'Amazon',
        _payee_name: 'Amazon',
        notes: '',
      });

      expect(transaction.notes).toBe('AMAZON - -$150.00 on 02/10/2024');
    });

    it('should extract parts of text with RIGHT', async () => {
      // Integration test: Parse imported payee name
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'DEBIT CARD' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Store: ", RIGHT(imported_payee, 10))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-01-20',
        imported_payee: 'DEBIT CARD PURCHASE - STORE #1234',
        notes: '',
      });

      expect(transaction.notes).toBe('Store: TORE #1234');
    });

    it('should use TRIM and PROPER for text formatting', async () => {
      // Integration test: Clean and format text
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'grocery' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=PROPER(TRIM(imported_payee))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -2000,
        date: '2024-01-30',
        imported_payee: '  grocery shopping  ',
        notes: '',
      });

      expect(transaction.notes).toBe('Grocery Shopping');
    });

    it('should use LEFT to extract prefix', async () => {
      // Integration test: Extract first part of payee name
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Amazon' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=CONCATENATE("Merchant: ", LEFT(imported_payee, 6))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -8000,
        date: '2024-02-01',
        imported_payee: 'Amazon Prime Subscription',
        notes: '',
      });

      expect(transaction.notes).toBe('Merchant: Amazon');
    });
  });

  describe('Math and Rounding Functions', () => {
    it('should calculate split amounts with ROUND and FORMATCURRENCY', async () => {
      // Integration test: Calculate split amount with rounding
      // Feedback: Users need proper number formatting
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Split' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Split: ", FORMATCURRENCY(ROUND((amount / 100) * 0.333, 2)))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -10000, // $100.00 in cents
        date: '2024-01-30',
        imported_payee: 'Split Payment',
        notes: '',
      });

      expect(transaction.notes).toBe('Split: -$33.30');
    });

    it('should use ABS, MAX for amount calculations', async () => {
      // Integration test: Calculate fee as percentage with minimum
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Fee' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Fee: ", FORMATCURRENCY(MAX((ABS(amount) / 100) * 0.01, 5)))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -50000, // $500.00 in cents
        date: '2024-02-01',
        imported_payee: 'Fee Charge',
        notes: '',
      });

      expect(transaction.notes).toBe('Fee: $5.00');
    });

    it('should use CEILING for rounding up', async () => {
      // Integration test: Round up to nearest dollar
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Round' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Rounded: ", FORMATCURRENCY(CEILING(amount / 100, -1)))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -4567, // $45.67 in cents
        date: '2024-02-05',
        imported_payee: 'Round Up',
        notes: '',
      });

      // CEILING rounds toward positive infinity, so -45.67 rounds to -46
      expect(transaction.notes).toBe('Rounded: -$46.00');
    });

    it('should use SQRT for calculations', async () => {
      // Integration test: Square root calculation
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Math' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Square root: ", FORMATNUMBER(SQRT(ABS(amount)), 2))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 10000, // $100.00
        date: '2024-02-10',
        imported_payee: 'Math Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Square root: 100.00');
    });
  });

  describe('Date Functions', () => {
    it('should extract date components with YEAR, MONTH, DAY', async () => {
      // Integration test: Build date description
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Date' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Year: ", YEAR(date), ", Month: ", MONTH(date), ", Day: ", DAY(date))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -7500,
        date: '2024-06-15',
        imported_payee: 'Date Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Year: 2024, Month: 6, Day: 15');
    });

    it('should calculate date differences with DAYS', async () => {
      // Integration test: Calculate days since transaction
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Days' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Days since: ", DAYS(TODAY(), date), " days")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-01-01',
        imported_payee: 'Days Test',
        notes: '',
      });

      expect(transaction.notes).toContain('Days since:');
      expect(transaction.notes).toContain('days');
    });

    it('should use EOMONTH for end-of-month calculations', async () => {
      // Integration test: Calculate next billing date
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Billing' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Due: ", TEXT(EOMONTH(date, 0), "YYYY-MM-DD"))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -12000,
        date: '2024-03-15',
        imported_payee: 'Billing Cycle',
        notes: '',
      });

      expect(transaction.notes).toBe('Due: 2024-03-31');
    });

    it('should use WEEKDAY to determine day of week', async () => {
      // Integration test: Check if transaction is on weekend
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Week' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=IF(OR(WEEKDAY(date) = 1, WEEKDAY(date) = 7), "Weekend", "Weekday")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -3000,
        date: '2024-01-15', // Monday
        imported_payee: 'Week Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Weekday');
    });
  });

  describe('Logical Functions', () => {
    it('should use AND/OR for complex conditions', async () => {
      // Integration test: Complex logical conditions
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Logic' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=IF(AND(amount < 0, ABS(amount) > 10000), "Large Expense", IF(OR(amount > 0, ABS(amount) < 1000), "Small Transaction", "Medium Transaction"))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -15000,
        date: '2024-02-20',
        imported_payee: 'Logic Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Large Expense');
    });

    it('should use IFERROR for safe calculations', async () => {
      // Integration test: Handle potential errors gracefully
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Error' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=IFERROR(CONCATENATE("Ratio: ", ROUND(10000 / amount, 2)), "Cannot divide by zero")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 0,
        date: '2024-02-25',
        imported_payee: 'Error Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Cannot divide by zero');
    });

    it('should use SWITCH for multiple value matching', async () => {
      // Integration test: Map month numbers to quarters
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Quarter' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Quarter: ", SWITCH(MONTH(date), 1, "Q1", 2, "Q1", 3, "Q1", 4, "Q2", 5, "Q2", 6, "Q2", 7, "Q3", 8, "Q3", 9, "Q3", 10, "Q4", 11, "Q4", 12, "Q4", "Unknown"))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -8000,
        date: '2024-04-10',
        imported_payee: 'Quarter Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Quarter: Q2');
    });

    it('should use NOT to invert conditions', async () => {
      // Integration test: Use NOT for logical inversion
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Not' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=IF(NOT(amount > 0), "Expense", "Income")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-03-01',
        imported_payee: 'Not Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Expense');
    });
  });

  describe('New Formatting Functions', () => {
    it('should use FORMATNUMBER for thousands separators', async () => {
      // Integration test: Format large numbers with separators
      // Feedback: Users requested thousands separator support
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Format' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Amount: ", FORMATNUMBER(amount / 100, 2))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 123456789, // $1,234,567.89
        date: '2024-03-01',
        imported_payee: 'Format Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Amount: 1,234,567.89');
    });

    it('should use FORMATCURRENCY with custom symbols', async () => {
      // Integration test: Format currency with Euro symbol
      // Feedback: Users need currency formatting with custom symbols
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Euro' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=FORMATCURRENCY(amount / 100, "€", 2)',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -50000, // cents
        date: '2024-03-05',
        imported_payee: 'Euro Transaction',
        notes: '',
      });

      expect(transaction.notes).toBe('-€500.00');
    });

    it('should use FORMATCURRENCY with European format', async () => {
      // Integration test: Format with European separators (. for thousands, , for decimal)
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'EU' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=FORMATCURRENCY(amount / 100, "€", 2, ".", ",")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 123456789,
        date: '2024-03-10',
        imported_payee: 'EU Payment',
        notes: '',
      });

      expect(transaction.notes).toBe('€1.234.567,89');
    });

    it('should use FORMATNUMBER without decimals', async () => {
      // Integration test: Format whole numbers
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Whole' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=FORMATNUMBER(amount / 100, 0)',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 1234500,
        date: '2024-03-15',
        imported_payee: 'Whole Number',
        notes: '',
      });

      expect(transaction.notes).toBe('12,345');
    });
  });

  describe('Complex Nested Formulas', () => {
    it('should handle deeply nested calculations', async () => {
      // Integration test: Complex financial calculation with multiple nested functions
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Loan' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Payment: ", FORMATCURRENCY(amount / 100), " | Principal: ", FORMATCURRENCY((amount / 100) * 0.8), " | Interest: ", FORMATCURRENCY((amount / 100) * 0.2), " | Month: ", MONTH(date))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -100000, // $1000 payment in cents
        date: '2024-01-15',
        imported_payee: 'Loan Payment',
        notes: '',
      });

      expect(transaction.notes).toBe(
        'Payment: -$1,000.00 | Principal: -$800.00 | Interest: -$200.00 | Month: 1',
      );
    });

    it('should combine multiple function types in one formula', async () => {
      // Integration test: Mix text, math, date, and logical functions
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Grocery' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE(UPPER(LEFT(imported_payee, 7)), " - ", IF(WEEKDAY(date) = 1, "Weekend", "Weekday"), " - ", FORMATCURRENCY(ABS(amount) / 100), " - ", MONTH(date), "/", DAY(date))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -8500, // cents
        date: '2024-02-14',
        imported_payee: 'Grocery Store',
        notes: '',
      });

      expect(transaction.notes).toContain('GROCERY');
      expect(transaction.notes).toContain('$85.00');
      expect(transaction.notes).toContain('2/14');
    });

    it('should use CHOOSE for index-based selection', async () => {
      // Integration test: Select value based on month (season calculation)
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Season' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Season: ", CHOOSE(CEILING(MONTH(date) / 3, 1), "Winter", "Spring", "Summer", "Fall"))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-07-15', // July = month 7, ceiling(7/3) = 3 = Summer
        imported_payee: 'Season Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Season: Summer');
    });
  });

  describe('Multi-line Output with CHAR(10)', () => {
    it('should create multi-line notes with line breaks', async () => {
      // Integration test: Create formatted multi-line output
      // Feedback: User @Juulz requested line break support
      const payeeId = await db.insertPayee({ name: 'Amazon' });

      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: payeeId }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Merchant: ", payee_name, CHAR(10), "Amount: ", FORMATCURRENCY(amount / 100), CHAR(10), "Date: ", YEAR(date), "-", MONTH(date), "-", DAY(date))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -25000, // cents
        date: '2024-03-20',
        payee: payeeId,
        payee_name: 'Amazon',
        _payee_name: 'Amazon',
        notes: '',
      });

      expect(transaction.notes).toContain('Merchant: Amazon');
      expect(transaction.notes).toContain('\n');
      expect(transaction.notes).toContain('Amount: -$250.00');
      expect(transaction.notes).toContain('Date: 2024-3-20');
    });

    it('should create multi-line summary with multiple calculations', async () => {
      // Integration test: Complex multi-line output with tax calculation
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Tax' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Transaction Summary", CHAR(10), "Amount: ", FORMATCURRENCY(amount / 100), CHAR(10), "Tax (10%): ", FORMATCURRENCY((amount / 100) * 0.1), CHAR(10), "Total: ", FORMATCURRENCY((amount / 100) * 1.1))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -10000,
        date: '2024-04-01',
        imported_payee: 'Tax Calculation',
        notes: '',
      });

      const lines = transaction.notes.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('Transaction Summary');
      expect(lines[1]).toBe('Amount: -$100.00');
      expect(lines[2]).toBe('Tax (10%): -$10.00');
      expect(lines[3]).toBe('Total: -$110.00');
    });
  });

  describe('Information Functions', () => {
    it('should use ISNUMBER to check value types', async () => {
      // Integration test: Type checking with ISNUMBER
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Number' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=IF(ISNUMBER(amount), "Valid amount", "Invalid")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 15000,
        date: '2024-04-10',
        imported_payee: 'Number Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Valid amount');
    });

    it('should use ISTEXT to check for text values', async () => {
      // Integration test: Type checking with ISTEXT
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Text' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=IF(ISTEXT(imported_payee), CONCATENATE("Payee: ", imported_payee), "No payee")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-04-15',
        imported_payee: 'Text Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Payee: Text Test');
    });

    it('should use ISEVEN and ISODD for number checks', async () => {
      // Integration test: Check if amount is even or odd
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Even' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=IF(ISEVEN(ABS(amount)), "Even amount", "Odd amount")',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -10000,
        date: '2024-04-20',
        imported_payee: 'Even Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Even amount');
    });

    it('should use ISBLANK to check for empty values', async () => {
      // Integration test: Check for blank notes field
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Blank' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=IF(ISBLANK(imported_payee), "No payee", CONCATENATE("Payee: ", imported_payee))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-04-25',
        imported_payee: 'Blank Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Payee: Blank Test');
    });
  });

  describe('Error Handling', () => {
    it('should handle formula errors gracefully', async () => {
      // Integration test: Invalid formula should not crash
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'DivZero' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula: '=1/0', // Division by zero
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-03-25',
        imported_payee: 'DivZero Test',
        notes: 'Original notes',
      });

      // Should preserve original value on error
      expect(transaction.notes).toBe('Original notes');
    });

    it('should validate numeric field output', async () => {
      // Integration test: String result for numeric field should be rejected
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Invalid' },
        ],
        actions: [
          {
            op: 'set',
            field: 'amount',
            value: null,
            options: {
              formula: '=UPPER("test")', // Returns string for numeric field
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 10000,
        date: '2024-03-30',
        imported_payee: 'Invalid Type',
      });

      // Should keep original value when formula produces non-numeric result
      expect(transaction.amount).toBe(10000);
    });
  });

  describe('Financial Calculations', () => {
    it('should calculate compound interest with POWER', async () => {
      // Integration test: Compound interest formula
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [
          { field: 'imported_payee', op: 'contains', value: 'Interest' },
        ],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Compound: ", FORMATCURRENCY((amount / 100) * POWER(1.05, 12)))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: 100000, // $1000 in cents
        date: '2024-05-01',
        imported_payee: 'Interest Calculation',
        notes: '',
      });

      expect(transaction.notes).toContain('Compound: $');
      expect(transaction.notes).toContain('1,795.86');
    });

    it('should use SUM and PRODUCT for calculations', async () => {
      // Integration test: Multiple math operations
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ field: 'imported_payee', op: 'contains', value: 'Calc' }],
        actions: [
          {
            op: 'set',
            field: 'notes',
            value: null,
            options: {
              formula:
                '=CONCATENATE("Sum: ", SUM(100, 200, 300), " | Product: ", PRODUCT(2, 3, 4))',
            },
          },
        ],
      });

      const transaction = await runRules({
        amount: -5000,
        date: '2024-05-05',
        imported_payee: 'Calc Test',
        notes: '',
      });

      expect(transaction.notes).toBe('Sum: 600 | Product: 24');
    });
  });
});
