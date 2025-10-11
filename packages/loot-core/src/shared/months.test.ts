import { describe, test, expect, beforeEach } from 'vitest';

import { createAllBudgets } from '../server/budget/base';
import * as db from '../server/db';
import * as sheet from '../server/sheet';

import * as monthUtils from './months';
import { setPayPeriodConfig, type PayPeriodConfig } from './pay-periods';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

describe('Pay Period Integration with Month Utilities', () => {
  const payPeriodConfig: PayPeriodConfig = {
    enabled: true,
    payFrequency: 'biweekly',
    startDate: '2024-01-05',
  };

  beforeEach(() => {
    setPayPeriodConfig(payPeriodConfig);
  });

  afterEach(() => {
    setPayPeriodConfig({
      enabled: false,
      payFrequency: 'biweekly',
      startDate: '2024-01-05',
    });
  });

  describe('Basic Month Utilities', () => {
    test('isPayPeriod correctly identifies pay period months', () => {
      expect(monthUtils.isPayPeriod('2024-01')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-12')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-13')).toBe(true);
      expect(monthUtils.isPayPeriod('2024-99')).toBe(true);
    });

    test('addMonths works with pay periods', () => {
      expect(monthUtils.addMonths('2024-13', 1)).toBe('2024-14');
      // When going backwards from pay period, it should go to previous pay period
      expect(monthUtils.addMonths('2024-13', -1)).toBe('2023-38'); // Previous year's last pay period
    });

    test('range generation works with pay periods', () => {
      const range = monthUtils.range('2024-13', '2024-15');
      expect(range).toContain('2024-13');
      expect(range).toContain('2024-14');
      // Note: range is exclusive of end, so 2024-15 won't be included
      expect(range).not.toContain('2024-15');
    });

    test('getMonthLabel returns appropriate labels', () => {
      // Calendar month
      expect(monthUtils.getMonthLabel('2024-01')).toContain('January');

      // Pay period
      const payPeriodLabel = monthUtils.getMonthLabel(
        '2024-13',
        payPeriodConfig,
      );
      expect(payPeriodLabel).toContain('Pay Period');
    });

    test('end-to-end pay period integration', () => {
      // Test that pay periods work with all month utilities
      const payPeriodMonth = '2024-13';

      // Month detection
      expect(monthUtils.isPayPeriod(payPeriodMonth)).toBe(true);

      // Month navigation
      expect(monthUtils.nextMonth(payPeriodMonth)).toBe('2024-14');
      expect(monthUtils.prevMonth(payPeriodMonth)).toBe('2023-38'); // Previous year's last period

      // Month arithmetic
      expect(monthUtils.addMonths(payPeriodMonth, 2)).toBe('2024-15');
      expect(monthUtils.subMonths(payPeriodMonth, 1)).toBe('2023-38');

      // Month range generation
      const range = monthUtils.range(payPeriodMonth, '2024-15');
      expect(range).toContain('2024-13');
      expect(range).toContain('2024-14');
      expect(range).not.toContain('2024-15'); // Exclusive end

      // Month labels and display
      const label = monthUtils.getMonthLabel(payPeriodMonth, payPeriodConfig);
      expect(label).toContain('Pay Period');

      const displayName = monthUtils.getMonthDisplayName(
        payPeriodMonth,
        payPeriodConfig,
      );
      expect(displayName).toMatch(/Jan-\d+/); // Should be "Jan-1" or similar

      const dateRange = monthUtils.getMonthDateRange(
        payPeriodMonth,
        payPeriodConfig,
      );
      expect(dateRange).toMatch(/\w{3} \d+ - \w{3} \d+/); // Should be "Jan 5 - Jan 18" format
    });
  });

  describe('Month Comparison Functions', () => {
    test('isBefore throws error for mixed month types', () => {
      expect(() => {
        monthUtils.isBefore('2025-31', '2026-09'); // pay period vs calendar month
      }).toThrow('Cannot compare mixed month types');

      expect(() => {
        monthUtils.isBefore('2025-31', '2026-09');
      }).toThrow("'2025-31' (pay period) vs '2026-09' (calendar month)");
    });

    test('isBefore works correctly for same month types - pay periods', () => {
      expect(monthUtils.isBefore('2025-13', '2025-14')).toBe(true);
      expect(monthUtils.isBefore('2025-31', '2025-32')).toBe(true);
      expect(monthUtils.isBefore('2025-32', '2025-31')).toBe(false);
    });

    test('isBefore works correctly for same month types - calendar months', () => {
      expect(monthUtils.isBefore('2025-01', '2025-02')).toBe(true);
      expect(monthUtils.isBefore('2025-12', '2026-01')).toBe(true);
      expect(monthUtils.isBefore('2026-01', '2025-12')).toBe(false);
    });

    test('isAfter throws error for mixed month types', () => {
      expect(() => {
        monthUtils.isAfter('2025-31', '2026-09'); // pay period vs calendar month
      }).toThrow('Cannot compare mixed month types');

      expect(() => {
        monthUtils.isAfter('2026-09', '2025-31'); // calendar month vs pay period
      }).toThrow("'2026-09' (calendar month) vs '2025-31' (pay period)");
    });

    test('isAfter works correctly for same month types - pay periods', () => {
      expect(monthUtils.isAfter('2025-14', '2025-13')).toBe(true);
      expect(monthUtils.isAfter('2025-32', '2025-31')).toBe(true);
      expect(monthUtils.isAfter('2025-31', '2025-32')).toBe(false);
    });

    test('isAfter works correctly for same month types - calendar months', () => {
      expect(monthUtils.isAfter('2025-02', '2025-01')).toBe(true);
      expect(monthUtils.isAfter('2026-01', '2025-12')).toBe(true);
      expect(monthUtils.isAfter('2025-12', '2026-01')).toBe(false);
    });

    test('handles Date objects correctly', () => {
      const date1 = new Date('2025-01-15');
      const date2 = new Date('2025-02-15');

      expect(monthUtils.isBefore(date1, date2)).toBe(true);
      expect(monthUtils.isAfter(date2, date1)).toBe(true);
    });

    test('handles mixed Date and string correctly for same types', () => {
      const date1 = new Date('2025-01-15');
      const monthStr = '2025-02';

      expect(monthUtils.isBefore(date1, monthStr)).toBe(true);
      expect(monthUtils.isAfter(monthStr, date1)).toBe(true);
    });
  });

  describe('Range Validation and Mixed Type Prevention', () => {
    test('Calendar month to pay period throws error', () => {
      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );

      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow(
        "Range from '2024-01' (calendar month) to '2024-13' (pay period) is invalid",
      );
    });

    test('Pay period to calendar month throws error', () => {
      expect(() => monthUtils.range('2024-13', '2024-03')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );

      expect(() => monthUtils.range('2024-13', '2024-03')).toThrow(
        "Range from '2024-13' (pay period) to '2024-03' (calendar month) is invalid",
      );
    });

    test('Error message includes helpful guidance', () => {
      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow(
        "Use either all calendar months (e.g., '2024-01' to '2024-03') or all pay periods (e.g., '2024-13' to '2024-15')",
      );
    });

    test('Pure pay period ranges work', () => {
      const payPeriodRange = monthUtils.range('2024-13', '2024-16');

      expect(payPeriodRange).toEqual(['2024-13', '2024-14', '2024-15']);
      expect(payPeriodRange.every(m => monthUtils.isPayPeriod(m))).toBe(true);
    });

    test('Single pay period works', () => {
      const singlePeriod = monthUtils.range('2024-13', '2024-14');
      expect(singlePeriod).toEqual(['2024-13']);
      expect(singlePeriod.every(m => monthUtils.isPayPeriod(m))).toBe(true);
    });

    test('Same month types with different years work', () => {
      // Pay periods across years should work
      const crossYearPay = monthUtils.range('2023-35', '2024-15');
      expect(crossYearPay.every(m => monthUtils.isPayPeriod(m))).toBe(true);
      expect(crossYearPay.length).toBeGreaterThan(0);

      // Should contain periods from both years
      expect(crossYearPay.some(m => m.startsWith('2023-'))).toBe(true);
      expect(crossYearPay.some(m => m.startsWith('2024-'))).toBe(true);
    });

    test('Mixed range detection works for edge case month numbers', () => {
      // Calendar month 12 (December) to pay period 13 (first pay period)
      expect(() => monthUtils.range('2024-12', '2024-13')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );

      // Pay period 99 (max) to calendar month 01
      expect(() => monthUtils.range('2024-99', '2025-01')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );
    });

    test('Empty ranges handled correctly', () => {
      // Same calendar month (empty range)
      expect(monthUtils.range('2024-01', '2024-01')).toEqual([]);

      // Same pay period (empty range)
      expect(monthUtils.range('2024-13', '2024-13')).toEqual([]);
    });

    test('bounds() still works for individual months', () => {
      // Calendar month bounds
      const calendarBounds = monthUtils.bounds('2024-01');
      expect(calendarBounds.start).toBe(20240101);
      expect(calendarBounds.end).toBe(20240131);

      // Pay period bounds
      const payPeriodBounds = monthUtils.bounds('2024-13');
      expect(payPeriodBounds.start).toBe(20240105);
      expect(payPeriodBounds.end).toBe(20240118);
    });

    test('addMonths() works correctly for both types', () => {
      // Calendar month navigation
      expect(monthUtils.addMonths('2024-01', 1)).toBe('2024-02');
      expect(monthUtils.addMonths('2024-12', 1)).toBe('2025-01');

      // Pay period navigation
      expect(monthUtils.addMonths('2024-13', 1)).toBe('2024-14');
      expect(monthUtils.addMonths('2024-38', 1)).toBe('2025-13'); // Next year's first pay period
    });

    test('Month type detection is consistent', () => {
      // Calendar months
      expect(monthUtils.isPayPeriod('2024-01')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-12')).toBe(false);

      // Pay periods
      expect(monthUtils.isPayPeriod('2024-13')).toBe(true);
      expect(monthUtils.isPayPeriod('2024-99')).toBe(true);

      // Invalid formats
      expect(monthUtils.isPayPeriod('2024-00')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-1')).toBe(false); // Not zero-padded
    });

    test('rangeInclusive prevents mixed calendar and pay-period ranges', () => {
      expect(() => monthUtils.rangeInclusive('2025-31', '2026-09')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );
      expect(() => monthUtils.rangeInclusive('2025-31', '2026-09')).toThrow(
        "Range from '2025-31' (pay period) to '2026-09' (calendar month) is invalid",
      );
    });

    test('pay-period arithmetic never produces calendar month identifiers', () => {
      const startPeriod = '2025-13';

      for (let offset = 0; offset <= 30; offset++) {
        const result = monthUtils.addMonths(startPeriod, offset);
        expect(monthUtils.isPayPeriod(result)).toBe(true);
        expect(result).not.toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      }
    });
  });

  describe('Transaction Filtering and Bounds', () => {
    async function setupTestData() {
      await sheet.loadSpreadsheet(db);

      // Set current month for testing
      global.currentMonth = '2024-13';

      // Create category groups and categories
      await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
      await db.insertCategoryGroup({
        id: 'income',
        name: 'Income',
        is_income: 1,
      });

      const groceriesId = await db.insertCategory({
        name: 'Groceries',
        cat_group: 'expenses',
      });

      await db.insertAccount({ id: 'checking', name: 'Checking Account' });

      // Enable pay periods
      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      });

      return { groceriesId };
    }

    test('month bounds work correctly for pay period transaction filtering', async () => {
      const { groceriesId } = await setupTestData();

      // Insert transactions in different pay periods
      await db.insertTransaction({
        date: '2024-01-10', // First pay period (2024-13): Jan 5-18
        amount: -3000,
        account: 'checking',
        category: groceriesId,
      });

      await db.insertTransaction({
        date: '2024-01-25', // Second pay period (2024-14): Jan 19 - Feb 1
        amount: -2000,
        account: 'checking',
        category: groceriesId,
      });

      await db.insertTransaction({
        date: '2024-02-10', // Third pay period (2024-15): Feb 2-15
        amount: -1500,
        account: 'checking',
        category: groceriesId,
      });

      // Test bounds calculation for pay periods
      const bounds13 = monthUtils.bounds('2024-13');
      const bounds14 = monthUtils.bounds('2024-14');
      const bounds15 = monthUtils.bounds('2024-15');

      // Verify bounds are correct
      expect(bounds13.start).toBe(20240105);
      expect(bounds13.end).toBe(20240118);
      expect(bounds14.start).toBe(20240119);
      expect(bounds14.end).toBe(20240201);
      expect(bounds15.start).toBe(20240202);
      expect(bounds15.end).toBe(20240215);

      // Test SQL queries that would be used for transaction filtering
      const query13 = db.runQuery<{ amount: number; date: number }>(
        `SELECT amount, date FROM v_transactions_internal_alive t
           LEFT JOIN accounts a ON a.id = t.account
         WHERE t.date >= ${bounds13.start} AND t.date <= ${bounds13.end}
           AND category = '${groceriesId}' AND a.offbudget = 0`,
        [],
        true,
      );

      const query14 = db.runQuery<{ amount: number; date: number }>(
        `SELECT amount, date FROM v_transactions_internal_alive t
           LEFT JOIN accounts a ON a.id = t.account
         WHERE t.date >= ${bounds14.start} AND t.date <= ${bounds14.end}
           AND category = '${groceriesId}' AND a.offbudget = 0`,
        [],
        true,
      );

      const query15 = db.runQuery<{ amount: number; date: number }>(
        `SELECT amount, date FROM v_transactions_internal_alive t
           LEFT JOIN accounts a ON a.id = t.account
         WHERE t.date >= ${bounds15.start} AND t.date <= ${bounds15.end}
           AND category = '${groceriesId}' AND a.offbudget = 0`,
        [],
        true,
      );

      // Verify transactions are correctly filtered by pay period
      expect(query13).toHaveLength(1);
      expect(query13[0].amount).toBe(-3000);
      expect(query13[0].date).toBe(20240110);

      expect(query14).toHaveLength(1);
      expect(query14[0].amount).toBe(-2000);
      expect(query14[0].date).toBe(20240125);

      expect(query15).toHaveLength(1);
      expect(query15[0].amount).toBe(-1500);
      expect(query15[0].date).toBe(20240210);
    });

    test('monthFromDate correctly converts transaction dates to pay periods', async () => {
      await setupTestData();

      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      });

      // Test monthFromDate function which is used in transaction filtering
      const month1 = monthUtils.monthFromDate('2024-01-10');
      const month2 = monthUtils.monthFromDate('2024-01-25');
      const month3 = monthUtils.monthFromDate('2024-02-10');

      // These should convert to the correct pay periods
      expect(month1).toBe('2024-13'); // First biweekly period of 2024
      expect(month2).toBe('2024-14'); // Second biweekly period of 2024
      expect(month3).toBe('2024-15'); // Third biweekly period of 2024
    });
  });

  describe('Budget Integration', () => {
    async function setupTestData() {
      await sheet.loadSpreadsheet(db);

      // Create expense category group and categories
      await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
      await db.insertCategoryGroup({
        id: 'income',
        name: 'Income',
        is_income: 1,
      });

      const groceriesId = await db.insertCategory({
        name: 'Groceries',
        cat_group: 'expenses',
      });

      const transportId = await db.insertCategory({
        name: 'Transportation',
        cat_group: 'expenses',
      });

      // Create account
      await db.insertAccount({ id: 'checking', name: 'Checking Account' });

      return { groceriesId, transportId };
    }

    test('spent amounts populate correctly in pay period sheets', async () => {
      // Set current month for testing
      global.currentMonth = '2024-13';

      const { groceriesId, transportId } = await setupTestData();

      // Enable pay periods with biweekly frequency starting 2024-01-05
      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      });

      await createAllBudgets();

      // Insert transactions in different pay periods

      // First pay period (2024-13): 2024-01-05 to 2024-01-18
      await db.insertTransaction({
        date: '2024-01-10', // Within first pay period
        amount: -5000, // $50.00
        account: 'checking',
        category: groceriesId,
      });

      await db.insertTransaction({
        date: '2024-01-15', // Within first pay period
        amount: -2500, // $25.00
        account: 'checking',
        category: transportId,
      });

      // Second pay period (2024-14): 2024-01-19 to 2024-02-01
      await db.insertTransaction({
        date: '2024-01-25', // Within second pay period
        amount: -3000, // $30.00
        account: 'checking',
        category: groceriesId,
      });

      // Third pay period (2024-15): 2024-02-02 to 2024-02-15
      await db.insertTransaction({
        date: '2024-02-10', // Within third pay period
        amount: -4000, // $40.00
        account: 'checking',
        category: transportId,
      });

      await sheet.waitOnSpreadsheet();

      // Verify spent amounts for first pay period (2024-13)
      const sheet13 = monthUtils.sheetForMonth('2024-13');
      expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(
        -5000,
      );
      expect(sheet.getCellValue(sheet13, `sum-amount-${transportId}`)).toBe(
        -2500,
      );
      expect(sheet.getCellValue(sheet13, 'group-sum-amount-expenses')).toBe(
        -7500,
      );
      expect(sheet.getCellValue(sheet13, 'total-spent')).toBe(-7500);

      // Verify spent amounts for second pay period (2024-14)
      const sheet14 = monthUtils.sheetForMonth('2024-14');
      expect(sheet.getCellValue(sheet14, `sum-amount-${groceriesId}`)).toBe(
        -3000,
      );
      expect(sheet.getCellValue(sheet14, `sum-amount-${transportId}`)).toBe(0);
      expect(sheet.getCellValue(sheet14, 'group-sum-amount-expenses')).toBe(
        -3000,
      );
      expect(sheet.getCellValue(sheet14, 'total-spent')).toBe(-3000);

      // Verify spent amounts for third pay period (2024-15)
      const sheet15 = monthUtils.sheetForMonth('2024-15');
      expect(sheet.getCellValue(sheet15, `sum-amount-${groceriesId}`)).toBe(0);
      expect(sheet.getCellValue(sheet15, `sum-amount-${transportId}`)).toBe(
        -4000,
      );
      expect(sheet.getCellValue(sheet15, 'group-sum-amount-expenses')).toBe(
        -4000,
      );
      expect(sheet.getCellValue(sheet15, 'total-spent')).toBe(-4000);
    });

    test('complete end-to-end pay period solution', async () => {
      global.currentMonth = '2024-13';

      const { groceriesId } = await setupTestData();

      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      });

      // Step 1: Create budgets and verify they work
      await createAllBudgets();

      // Step 2: Add transactions in pay periods
      await db.insertTransaction({
        date: '2024-01-10', // Pay period 2024-13
        amount: -5000,
        account: 'checking',
        category: groceriesId,
      });

      await sheet.waitOnSpreadsheet();

      // Step 3: Verify budget spent amounts populate correctly
      const sheetName = monthUtils.sheetForMonth('2024-13');
      const spentAmount = sheet.getCellValue(
        sheetName,
        `sum-amount-${groceriesId}`,
      );

      expect(spentAmount).toBe(-5000);

      // Step 4: Verify transaction viewing works with frontend fix
      const bounds = monthUtils.bounds('2024-13');
      const transactionQuery = db.runQuery<{ amount: number; date: number }>(
        `SELECT amount, date FROM v_transactions_internal_alive t
           LEFT JOIN accounts a ON a.id = t.account
         WHERE t.date >= ${bounds.start} AND t.date <= ${bounds.end}
           AND category = '${groceriesId}' AND a.offbudget = 0`,
        [],
        true,
      );

      expect(transactionQuery).toHaveLength(1);
      expect(transactionQuery[0].amount).toBe(-5000);
    });
  });
});
