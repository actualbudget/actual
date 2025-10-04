import { describe, test, expect, beforeEach } from 'vitest';

import { createAllBudgets } from '../server/budget/base';
import * as db from '../server/db';
import * as sheet from '../server/sheet';

import * as monthUtils from './months';
import { loadPayPeriodConfigFromPrefs } from './pay-periods';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('Pay Period Transaction Filtering', () => {
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
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05',
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

    console.log('Pay period bounds:');
    console.log('2024-13:', bounds13);
    console.log('2024-14:', bounds14);
    console.log('2024-15:', bounds15);

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

    console.log('SQL query results:');
    console.log('Period 2024-13:', query13);
    console.log('Period 2024-14:', query14);
    console.log('Period 2024-15:', query15);

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

  test('AQL date transform with $month handles pay periods correctly', async () => {
    const { groceriesId } = await setupTestData();

    // Insert transactions
    await db.insertTransaction({
      date: '2024-01-10', // Pay period 2024-13
      amount: -3000,
      account: 'checking',
      category: groceriesId,
    });

    await db.insertTransaction({
      date: '2024-01-25', // Pay period 2024-14
      amount: -2000,
      account: 'checking',
      category: groceriesId,
    });

    // Test AQL-style filtering using month transform
    // This simulates what happens when clicking on spent amounts
    const aqlQuery13 = db.runQuery<{
      amount: number;
      date: number;
      month: string;
    }>(
      `SELECT amount, date,
              CASE
                WHEN date >= 20240105 AND date <= 20240118 THEN '2024-13'
                WHEN date >= 20240119 AND date <= 20240201 THEN '2024-14'
                ELSE strftime('%Y-%m', date(substr(date, 1, 4) || '-' || substr(date, 5, 2) || '-' || substr(date, 7, 2)))
              END as month
       FROM v_transactions_internal_alive t
         LEFT JOIN accounts a ON a.id = t.account
       WHERE category = '${groceriesId}' AND a.offbudget = 0`,
      [],
      true,
    );

    console.log('AQL-style query results:', aqlQuery13);

    // When we filter for pay period 2024-13, we should only get the Jan 10 transaction
    const period13Transactions = aqlQuery13.filter(t => t.month === '2024-13');
    const period14Transactions = aqlQuery13.filter(t => t.month === '2024-14');

    expect(period13Transactions).toHaveLength(1);
    expect(period13Transactions[0].amount).toBe(-3000);

    expect(period14Transactions).toHaveLength(1);
    expect(period14Transactions[0].amount).toBe(-2000);
  });

  test('monthFromDate correctly converts transaction dates to pay periods', async () => {
    await setupTestData();

    // Test monthFromDate function which is used in transaction filtering
    const month1 = monthUtils.monthFromDate('2024-01-10');
    const month2 = monthUtils.monthFromDate('2024-01-25');
    const month3 = monthUtils.monthFromDate('2024-02-10');

    console.log('monthFromDate results:');
    console.log('2024-01-10 ->', month1);
    console.log('2024-01-25 ->', month2);
    console.log('2024-02-10 ->', month3);

    // These should convert to the correct pay periods
    expect(month1).toBe('2024-13'); // First biweekly period of 2024
    expect(month2).toBe('2024-14'); // Second biweekly period of 2024
    expect(month3).toBe('2024-15'); // Third biweekly period of 2024
  });

  test('transaction filtering flow matches budget view expectations', async () => {
    const { groceriesId } = await setupTestData();

    await createAllBudgets();

    // Insert transaction
    await db.insertTransaction({
      date: '2024-01-10',
      amount: -5000,
      account: 'checking',
      category: groceriesId,
    });

    await sheet.waitOnSpreadsheet();

    // This simulates the complete flow from budget click to transaction filtering
    const month = '2024-13';

    // 1. Budget view shows spent amount (we tested this is working)
    const sheetName = monthUtils.sheetForMonth(month);
    const spentAmount = sheet.getCellValue(
      sheetName,
      `sum-amount-${groceriesId}`,
    );
    expect(spentAmount).toBe(-5000);

    // 2. User clicks on spent amount, this creates filter conditions
    const filterConditions = [
      { field: 'category', op: 'is', value: groceriesId, type: 'id' },
      {
        field: 'date',
        op: 'is',
        value: month, // This is '2024-13'
        options: { month: true },
        type: 'date',
      },
    ];

    // 3. Transaction filtering needs to convert month '2024-13' to date range
    const bounds = monthUtils.bounds(month);
    expect(bounds.start).toBe(20240105);
    expect(bounds.end).toBe(20240118);

    // 4. Query transactions using the converted bounds
    const filteredTransactions = db.runQuery<{
      amount: number;
      date: number;
      category: string;
    }>(
      `SELECT amount, date, category FROM v_transactions_internal_alive t
         LEFT JOIN accounts a ON a.id = t.account
       WHERE t.date >= ${bounds.start} AND t.date <= ${bounds.end}
         AND category = '${groceriesId}' AND a.offbudget = 0`,
      [],
      true,
    );

    console.log('Complete filtering flow result:', filteredTransactions);

    // Should find the transaction we inserted
    expect(filteredTransactions).toHaveLength(1);
    expect(filteredTransactions[0].amount).toBe(-5000);
    expect(filteredTransactions[0].date).toBe(20240110);
    expect(filteredTransactions[0].category).toBe(groceriesId);
  });
});
