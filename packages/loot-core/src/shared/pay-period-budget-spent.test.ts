import { describe, test, expect, beforeEach } from 'vitest';
import * as monthUtils from './months';
import * as db from '../server/db';
import * as sheet from '../server/sheet';
import { createAllBudgets } from '../server/budget/base';
import { loadPayPeriodConfigFromPrefs } from './pay-periods';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('Pay Period Budget Spent Column Population', () => {
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

  test('spent amounts populate correctly in pay period sheets when pay periods are enabled', async () => {
    // Set current month for testing
    global.currentMonth = '2024-13';

    const { groceriesId, transportId } = await setupTestData();

    // Enable pay periods with biweekly frequency starting 2024-01-05
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
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
    expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(-5000);
    expect(sheet.getCellValue(sheet13, `sum-amount-${transportId}`)).toBe(-2500);
    expect(sheet.getCellValue(sheet13, 'group-sum-amount-expenses')).toBe(-7500);
    expect(sheet.getCellValue(sheet13, 'total-spent')).toBe(-7500);

    // Verify spent amounts for second pay period (2024-14)
    const sheet14 = monthUtils.sheetForMonth('2024-14');
    expect(sheet.getCellValue(sheet14, `sum-amount-${groceriesId}`)).toBe(-3000);
    expect(sheet.getCellValue(sheet14, `sum-amount-${transportId}`)).toBe(0);
    expect(sheet.getCellValue(sheet14, 'group-sum-amount-expenses')).toBe(-3000);
    expect(sheet.getCellValue(sheet14, 'total-spent')).toBe(-3000);

    // Verify spent amounts for third pay period (2024-15)
    const sheet15 = monthUtils.sheetForMonth('2024-15');
    expect(sheet.getCellValue(sheet15, `sum-amount-${groceriesId}`)).toBe(0);
    expect(sheet.getCellValue(sheet15, `sum-amount-${transportId}`)).toBe(-4000);
    expect(sheet.getCellValue(sheet15, 'group-sum-amount-expenses')).toBe(-4000);
    expect(sheet.getCellValue(sheet15, 'total-spent')).toBe(-4000);
  });

  test('spent amounts update correctly when transactions are modified in pay periods', async () => {
    // Set current month for testing
    global.currentMonth = '2024-13';

    const { groceriesId } = await setupTestData();

    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });

    await createAllBudgets();

    // Insert initial transaction
    const transactionId = await db.insertTransaction({
      date: '2024-01-10', // First pay period (2024-13)
      amount: -5000,
      account: 'checking',
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify initial spent amount
    const sheet13 = monthUtils.sheetForMonth('2024-13');
    expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(-5000);

    // Update transaction amount
    await db.updateTransaction({
      id: transactionId,
      date: '2024-01-10',
      amount: -8000, // Increased to $80.00
      account: 'checking',
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify updated spent amount
    expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(-8000);
  });

  test('spent amounts transfer correctly when transaction date changes pay periods', async () => {
    // Set current month for testing
    global.currentMonth = '2024-13';

    const { groceriesId } = await setupTestData();

    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });

    await createAllBudgets();

    // Insert transaction in first pay period
    const transactionId = await db.insertTransaction({
      date: '2024-01-10', // First pay period (2024-13)
      amount: -5000,
      account: 'checking',
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify initial spent amount in first pay period
    const sheet13 = monthUtils.sheetForMonth('2024-13');
    const sheet14 = monthUtils.sheetForMonth('2024-14');
    expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(-5000);
    expect(sheet.getCellValue(sheet14, `sum-amount-${groceriesId}`)).toBe(0);

    // Move transaction to second pay period
    await db.updateTransaction({
      id: transactionId,
      date: '2024-01-25', // Second pay period (2024-14)
      amount: -5000,
      account: 'checking',
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify spent amounts moved to correct pay period
    expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(0);
    expect(sheet.getCellValue(sheet14, `sum-amount-${groceriesId}`)).toBe(-5000);
  });

  test('spent amounts handle different pay period frequencies correctly', async () => {
    // Set current month for testing
    global.currentMonth = '2024-13';

    const { groceriesId } = await setupTestData();

    // Test weekly pay periods
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'weekly',
      payPeriodStartDate: '2024-01-01' // Monday
    });

    await createAllBudgets();

    // Insert transactions in different weeks
    await db.insertTransaction({
      date: '2024-01-03', // First week (2024-13)
      amount: -2000,
      account: 'checking',
      category: groceriesId,
    });

    await db.insertTransaction({
      date: '2024-01-10', // Second week (2024-14)
      amount: -3000,
      account: 'checking',
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify spent amounts in weekly periods
    const weekSheet13 = monthUtils.sheetForMonth('2024-13');
    const weekSheet14 = monthUtils.sheetForMonth('2024-14');
    expect(sheet.getCellValue(weekSheet13, `sum-amount-${groceriesId}`)).toBe(-2000);
    expect(sheet.getCellValue(weekSheet14, `sum-amount-${groceriesId}`)).toBe(-3000);

    // Clear budget and test monthly pay periods
    sheet.get().meta().createdMonths = new Set();

    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'monthly',
      payPeriodStartDate: '2024-01-15' // 15th of each month
    });

    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    // Verify spent amounts still calculated correctly for monthly periods
    const monthlySheet13 = monthUtils.sheetForMonth('2024-13');
    const monthlySheet14 = monthUtils.sheetForMonth('2024-14');

    // First monthly period: Jan 15 - Feb 14
    // Second monthly period: Feb 15 - Mar 14
    // Both transactions (Jan 3 and Jan 10) should be in period before first monthly period
    // or split based on actual date ranges
    const totalSpent = sheet.getCellValue(monthlySheet13, `sum-amount-${groceriesId}`) +
                      sheet.getCellValue(monthlySheet14, `sum-amount-${groceriesId}`);
    expect(totalSpent).toBe(-5000); // Both transactions should be accounted for
  });

  test('spent amounts work correctly when pay periods are disabled then re-enabled', async () => {
    // Set current month for testing
    global.currentMonth = '2024-13';

    const { groceriesId } = await setupTestData();

    // Start with pay periods enabled
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });

    await createAllBudgets();

    // Insert transaction
    await db.insertTransaction({
      date: '2024-01-10',
      amount: -5000,
      account: 'checking',
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify spent amount in pay period
    const payPeriodSheet = monthUtils.sheetForMonth('2024-13');
    expect(sheet.getCellValue(payPeriodSheet, `sum-amount-${groceriesId}`)).toBe(-5000);

    // Disable pay periods
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'false'
    });

    // Clear and recreate budgets to simulate switching back to calendar months
    sheet.get().meta().createdMonths = new Set();
    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    // Verify spent amount in regular calendar month
    const calendarSheet = monthUtils.sheetForMonth('2024-01');
    expect(sheet.getCellValue(calendarSheet, `sum-amount-${groceriesId}`)).toBe(-5000);

    // Re-enable pay periods
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });

    // Clear and recreate budgets to simulate switching back to pay periods
    sheet.get().meta().createdMonths = new Set();
    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    // Verify spent amount back in pay period
    expect(sheet.getCellValue(payPeriodSheet, `sum-amount-${groceriesId}`)).toBe(-5000);
  });

  test('spent amounts handle off-budget accounts correctly in pay periods', async () => {
    // Set current month for testing
    global.currentMonth = '2024-13';

    const { groceriesId } = await setupTestData();

    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });

    // Create off-budget account
    await db.insertAccount({
      id: 'investment',
      name: 'Investment Account',
      offbudget: 1
    });

    await createAllBudgets();

    // Insert transactions in on-budget and off-budget accounts
    await db.insertTransaction({
      date: '2024-01-10',
      amount: -5000,
      account: 'checking', // On-budget
      category: groceriesId,
    });

    await db.insertTransaction({
      date: '2024-01-10',
      amount: -3000,
      account: 'investment', // Off-budget
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify only on-budget transaction is counted
    const sheet13 = monthUtils.sheetForMonth('2024-13');
    expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(-5000);
    expect(sheet.getCellValue(sheet13, 'total-spent')).toBe(-5000);
  });

  test('spent amounts aggregate correctly across multiple categories within pay periods', async () => {
    // Set current month for testing
    global.currentMonth = '2024-13';

    const { groceriesId, transportId } = await setupTestData();

    // Add more categories
    const entertainmentId = await db.insertCategory({
      name: 'Entertainment',
      cat_group: 'expenses',
    });

    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });

    await createAllBudgets();

    // Insert multiple transactions across categories in same pay period
    await db.insertTransaction({
      date: '2024-01-10', // First pay period (2024-13)
      amount: -5000, // Groceries
      account: 'checking',
      category: groceriesId,
    });

    await db.insertTransaction({
      date: '2024-01-12', // First pay period (2024-13)
      amount: -2500, // Transportation
      account: 'checking',
      category: transportId,
    });

    await db.insertTransaction({
      date: '2024-01-15', // First pay period (2024-13)
      amount: -1500, // Entertainment
      account: 'checking',
      category: entertainmentId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify individual category spent amounts
    const sheet13 = monthUtils.sheetForMonth('2024-13');
    expect(sheet.getCellValue(sheet13, `sum-amount-${groceriesId}`)).toBe(-5000);
    expect(sheet.getCellValue(sheet13, `sum-amount-${transportId}`)).toBe(-2500);
    expect(sheet.getCellValue(sheet13, `sum-amount-${entertainmentId}`)).toBe(-1500);

    // Verify group total
    expect(sheet.getCellValue(sheet13, 'group-sum-amount-expenses')).toBe(-9000);

    // Verify overall total spent
    expect(sheet.getCellValue(sheet13, 'total-spent')).toBe(-9000);
  });
});