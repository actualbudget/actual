// @ts-strict-ignore
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import * as sheet from '#server/sheet';

import {
  autoHoldForNextMonth,
  calculateAutoHoldPlan,
  copyUntilYearEnd,
  coverOverbudgeted,
  getAutoHoldMonthsToInspect,
  getSheetBoolean,
  getSheetValue,
  set3MonthAvg,
  setBudget,
  setCategoryCarryover,
  setNMonthAvg,
} from './actions';
import * as budget from './base';

describe('calculateAutoHoldPlan', () => {
  it('sets cumulative hold amounts needed to cover future budgets', () => {
    expect(
      calculateAutoHoldPlan({
        surplus: 700,
        months: [
          {
            month: '2024-01',
            income: 0,
            budgeted: 300,
            overspent: 0,
            toBudgetCapacity: 700,
          },
          {
            month: '2024-02',
            income: 0,
            budgeted: 200,
            overspent: 0,
            toBudgetCapacity: 500,
          },
          {
            month: '2024-03',
            income: 0,
            budgeted: 400,
            overspent: 0,
            toBudgetCapacity: 100,
          },
          {
            month: '2024-04',
            income: 0,
            budgeted: 100,
            overspent: 0,
            toBudgetCapacity: 0,
          },
        ],
      }),
    ).toEqual([
      { month: '2024-01', amount: 700 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
  });

  it('prioritizes earlier months when surplus is exhausted', () => {
    expect(
      calculateAutoHoldPlan({
        surplus: 500,
        months: [
          {
            month: '2024-01',
            income: 0,
            budgeted: 300,
            overspent: 0,
            toBudgetCapacity: 700,
          },
          {
            month: '2024-02',
            income: 0,
            budgeted: 200,
            overspent: 0,
            toBudgetCapacity: 300,
          },
          {
            month: '2024-03',
            income: 0,
            budgeted: 400,
            overspent: 0,
            toBudgetCapacity: 0,
          },
          {
            month: '2024-04',
            income: 0,
            budgeted: 100,
            overspent: 0,
            toBudgetCapacity: 0,
          },
        ],
      }),
    ).toEqual([
      { month: '2024-01', amount: 500 },
      { month: '2024-02', amount: 300 },
      { month: '2024-03', amount: 0 },
    ]);
  });

  it('leaves surplus beyond future budgets in the selected month', () => {
    expect(
      calculateAutoHoldPlan({
        surplus: 900,
        months: [
          {
            month: '2024-01',
            income: 0,
            budgeted: 300,
            overspent: 0,
            toBudgetCapacity: 700,
          },
          {
            month: '2024-02',
            income: 0,
            budgeted: 200,
            overspent: 0,
            toBudgetCapacity: 500,
          },
          {
            month: '2024-03',
            income: 0,
            budgeted: 400,
            overspent: 0,
            toBudgetCapacity: 100,
          },
          {
            month: '2024-04',
            income: 0,
            budgeted: 100,
            overspent: 0,
            toBudgetCapacity: 0,
          },
        ],
      }),
    ).toEqual([
      { month: '2024-01', amount: 700 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
  });

  it('caps each hold amount so To Budget does not drop below zero', () => {
    expect(
      calculateAutoHoldPlan({
        surplus: 700,
        months: [
          {
            month: '2024-01',
            income: 0,
            budgeted: 300,
            overspent: 0,
            toBudgetCapacity: 700,
          },
          {
            month: '2024-02',
            income: 0,
            budgeted: 200,
            overspent: 0,
            toBudgetCapacity: 300,
          },
          {
            month: '2024-03',
            income: 0,
            budgeted: 400,
            overspent: 0,
            toBudgetCapacity: 100,
          },
          {
            month: '2024-04',
            income: 0,
            budgeted: 100,
            overspent: 0,
            toBudgetCapacity: 0,
          },
        ],
      }),
    ).toEqual([
      { month: '2024-01', amount: 700 },
      { month: '2024-02', amount: 300 },
      { month: '2024-03', amount: 0 },
    ]);
  });

  it('includes overspending in the last inspected month', () => {
    expect(
      calculateAutoHoldPlan({
        surplus: 1000,
        months: [
          {
            month: '2024-01',
            income: 0,
            budgeted: 300,
            overspent: 0,
            toBudgetCapacity: 1000,
          },
          {
            month: '2024-02',
            income: 0,
            budgeted: 200,
            overspent: 0,
            toBudgetCapacity: 800,
          },
          {
            month: '2024-03',
            income: 0,
            budgeted: 400,
            overspent: 0,
            toBudgetCapacity: 400,
          },
          {
            month: '2024-04',
            income: 0,
            budgeted: 100,
            overspent: 300,
            toBudgetCapacity: 0,
          },
        ],
      }),
    ).toEqual([
      { month: '2024-01', amount: 1000 },
      { month: '2024-02', amount: 800 },
      { month: '2024-03', amount: 400 },
    ]);
  });

  it('reduces required hold amounts by future income', () => {
    expect(
      calculateAutoHoldPlan({
        surplus: 700,
        months: [
          {
            month: '2024-01',
            income: 0,
            budgeted: 300,
            overspent: 0,
            toBudgetCapacity: 700,
          },
          {
            month: '2024-02',
            income: 100,
            budgeted: 200,
            overspent: 0,
            toBudgetCapacity: 500,
          },
          {
            month: '2024-03',
            income: 0,
            budgeted: 400,
            overspent: 0,
            toBudgetCapacity: 100,
          },
          {
            month: '2024-04',
            income: 0,
            budgeted: 100,
            overspent: 0,
            toBudgetCapacity: 0,
          },
        ],
      }),
    ).toEqual([
      { month: '2024-01', amount: 600 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
  });

  it('can ignore surplus and To Budget capacity limits', () => {
    expect(
      calculateAutoHoldPlan({
        surplus: 100,
        allowNegativeToBudget: true,
        months: [
          {
            month: '2024-01',
            income: 0,
            budgeted: 300,
            overspent: 0,
            toBudgetCapacity: 100,
          },
          {
            month: '2024-02',
            income: 0,
            budgeted: 200,
            overspent: 0,
            toBudgetCapacity: 50,
          },
          {
            month: '2024-03',
            income: 0,
            budgeted: 400,
            overspent: 0,
            toBudgetCapacity: 0,
          },
          {
            month: '2024-04',
            income: 0,
            budgeted: 100,
            overspent: 0,
            toBudgetCapacity: 0,
          },
        ],
      }),
    ).toEqual([
      { month: '2024-01', amount: 700 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
  });
});

describe('autoHoldForNextMonth', () => {
  beforeEach(global.emptyDatabase());
  afterEach(global.emptyDatabase());

  it('sets hold amounts for the selected and future months', async () => {
    await setupAutoHoldDatabase({
      income: 1000,
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
        '2024-03': 400,
        '2024-04': 100,
      },
    });

    const plan = await autoHoldForNextMonth({ month: '2024-01', months: 3 });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([
      { month: '2024-01', amount: 700 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
    expect(await getSheetValue('budget202401', 'buffered')).toBe(700);
    expect(await getSheetValue('budget202402', 'buffered')).toBe(500);
    expect(await getSheetValue('budget202403', 'buffered')).toBe(100);
    expect(await getSheetValue('budget202404', 'buffered')).toBe(0);
    expect(await getSheetValue('budget202401', 'to-budget')).toBe(0);
    expect(await getSheetValue('budget202402', 'to-budget')).toBe(0);
    expect(await getSheetValue('budget202403', 'to-budget')).toBe(0);
    expect(await getSheetValue('budget202404', 'to-budget')).toBe(0);
  });

  it('can use the default horizon through the last future budgeted month', async () => {
    await setupAutoHoldDatabase({
      income: 1000,
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
        '2024-04': 100,
      },
    });

    const months = await getAutoHoldMonthsToInspect({ month: '2024-01' });
    const plan = await autoHoldForNextMonth({ month: '2024-01', months });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([
      { month: '2024-01', amount: 300 },
      { month: '2024-02', amount: 100 },
      { month: '2024-03', amount: 100 },
    ]);
    expect(await getSheetValue('budget202401', 'buffered')).toBe(300);
    expect(await getSheetValue('budget202402', 'buffered')).toBe(100);
    expect(await getSheetValue('budget202403', 'buffered')).toBe(100);
    expect(await getSheetValue('budget202404', 'buffered')).toBe(0);
  });

  it('does not reset income carryover when no plan is produced', async () => {
    await setupAutoHoldDatabase({
      income: 1000,
      budgetedByMonth: {
        '2024-01': 300,
      },
      months: ['2024-01'],
    });
    await setCategoryCarryover({
      startMonth: '2024-01',
      category: 'income-cat',
      flag: true,
    });
    await sheet.waitOnSpreadsheet();

    const plan = await autoHoldForNextMonth({ month: '2024-01', months: 1 });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([]);
    expect(await getSheetBoolean('budget202401', 'carryover-income-cat')).toBe(
      true,
    );
  });

  it('does not reset income carryover when the plan only has zero amounts', async () => {
    await setupAutoHoldDatabase({
      income: 300,
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
      },
    });
    await setCategoryCarryover({
      startMonth: '2024-01',
      category: 'income-cat',
      flag: true,
    });
    await sheet.waitOnSpreadsheet();

    const plan = await autoHoldForNextMonth({ month: '2024-01', months: 1 });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([]);
    expect(await getSheetBoolean('budget202401', 'carryover-income-cat')).toBe(
      true,
    );
  });

  it('accounts for overspending when setting future hold amounts', async () => {
    await setupAutoHoldDatabase({
      income: 1000,
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
        '2024-03': 400,
        '2024-04': 100,
      },
      spendingByMonth: {
        '2024-01': 500,
      },
    });

    const plan = await autoHoldForNextMonth({ month: '2024-01', months: 3 });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([
      { month: '2024-01', amount: 700 },
      { month: '2024-02', amount: 300 },
      { month: '2024-03', amount: 0 },
    ]);
    expect(await getSheetValue('budget202402', 'buffered')).toBe(300);
    expect(await getSheetValue('budget202402', 'to-budget')).toBe(0);
  });

  it('covers overspending in the last inspected month', async () => {
    await setupAutoHoldDatabase({
      income: 1300,
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
        '2024-03': 400,
        '2024-04': 100,
      },
      spendingByMonth: {
        '2024-03': 1200,
      },
    });

    const plan = await autoHoldForNextMonth({ month: '2024-01', months: 3 });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([
      { month: '2024-01', amount: 1000 },
      { month: '2024-02', amount: 800 },
      { month: '2024-03', amount: 400 },
    ]);
    expect(await getSheetValue('budget202404', 'to-budget')).toBe(0);
  });

  it('can set holds beyond surplus when negative To Budget is allowed', async () => {
    await setupAutoHoldDatabase({
      income: 500,
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
        '2024-03': 400,
        '2024-04': 100,
      },
    });

    const plan = await autoHoldForNextMonth({
      month: '2024-01',
      months: 3,
      allowNegativeToBudget: true,
    });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([
      { month: '2024-01', amount: 700 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
    expect(await getSheetValue('budget202401', 'to-budget')).toBe(-500);
  });

  it('uses future income to reduce current hold amounts', async () => {
    await setupAutoHoldDatabase({
      income: 1000,
      incomeByMonth: {
        '2024-02': 200,
      },
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
        '2024-03': 400,
        '2024-04': 100,
      },
    });

    const plan = await autoHoldForNextMonth({ month: '2024-01', months: 3 });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([
      { month: '2024-01', amount: 500 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
    expect(await getSheetValue('budget202401', 'buffered')).toBe(500);
    expect(await getSheetValue('budget202402', 'buffered')).toBe(500);
    expect(await getSheetValue('budget202403', 'buffered')).toBe(100);
    expect(await getSheetValue('budget202401', 'to-budget')).toBe(200);
  });

  it('sets future holds from future income when current surplus is zero', async () => {
    await setupAutoHoldDatabase({
      income: 300,
      incomeByMonth: {
        '2024-02': 700,
      },
      budgetedByMonth: {
        '2024-01': 300,
        '2024-02': 200,
        '2024-03': 400,
        '2024-04': 100,
      },
    });

    const plan = await autoHoldForNextMonth({ month: '2024-01', months: 3 });
    await sheet.waitOnSpreadsheet();

    expect(plan).toEqual([
      { month: '2024-01', amount: 0 },
      { month: '2024-02', amount: 500 },
      { month: '2024-03', amount: 100 },
    ]);
    expect(await getSheetValue('budget202401', 'buffered')).toBe(0);
    expect(await getSheetValue('budget202402', 'buffered')).toBe(500);
    expect(await getSheetValue('budget202403', 'buffered')).toBe(100);
  });
});

describe('copyUntilYearEnd', () => {
  beforeEach(global.emptyDatabase());
  afterEach(global.emptyDatabase());

  async function setupDatabase() {
    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategory({
      id: 'income-cat',
      name: 'Income',
      cat_group: 'income-group',
      is_income: 1,
    });
    await db.insertCategoryGroup({
      id: 'group1',
      name: 'group1',
      is_income: 0,
    });
    await db.insertCategory({
      id: 'cat1',
      name: 'cat1',
      cat_group: 'group1',
      is_income: 0,
    });
    await sheet.loadSpreadsheet(db);
    await budget.createBudget(['2024-01', '2024-02', '2024-03']);
  }

  it('copies the current month budget to all future months in the same year', async () => {
    await setupDatabase();

    await setBudget({ category: 'cat1', month: '2024-01', amount: 5000 });
    await setBudget({ category: 'cat1', month: '2024-02', amount: 1000 });
    await setBudget({ category: 'cat1', month: '2024-03', amount: 2000 });
    await sheet.waitOnSpreadsheet();

    await copyUntilYearEnd({ month: '2024-01', category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202401', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202402', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202403', 'budget-cat1')).toBe(5000);
  });

  it('overwrites future months including those with zero budgets', async () => {
    await setupDatabase();

    await setBudget({ category: 'cat1', month: '2024-01', amount: 5000 });
    // 2024-02 intentionally left at 0
    await setBudget({ category: 'cat1', month: '2024-03', amount: 2000 });
    await sheet.waitOnSpreadsheet();

    await copyUntilYearEnd({ month: '2024-01', category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202401', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202402', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202403', 'budget-cat1')).toBe(5000);
  });

  it('does not affect months before or equal to the current month', async () => {
    await setupDatabase();

    await setBudget({ category: 'cat1', month: '2024-01', amount: 1000 });
    await setBudget({ category: 'cat1', month: '2024-02', amount: 5000 });
    await setBudget({ category: 'cat1', month: '2024-03', amount: 2000 });
    await sheet.waitOnSpreadsheet();

    await copyUntilYearEnd({ month: '2024-02', category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202401', 'budget-cat1')).toBe(1000);
    expect(await getSheetValue('budget202402', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202403', 'budget-cat1')).toBe(5000);
  });

  it('copies the current month budget to future months in tracking budget mode', async () => {
    await setupDatabase();
    db.runQuery(
      `INSERT INTO preferences (id, value) VALUES ('budgetType', 'tracking')`,
    );

    await setBudget({ category: 'cat1', month: '2024-01', amount: 5000 });
    await setBudget({ category: 'cat1', month: '2024-02', amount: 1000 });
    await setBudget({ category: 'cat1', month: '2024-03', amount: 2000 });
    await sheet.waitOnSpreadsheet();

    await copyUntilYearEnd({ month: '2024-01', category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202401', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202402', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202403', 'budget-cat1')).toBe(5000);
  });

  it('does not copy to months beyond the current calendar year', async () => {
    await setupDatabase();
    await budget.createBudget(['2024-11', '2024-12', '2025-01']);

    await setBudget({ category: 'cat1', month: '2024-11', amount: 5000 });
    await setBudget({ category: 'cat1', month: '2024-12', amount: 1000 });
    await setBudget({ category: 'cat1', month: '2025-01', amount: 2000 });
    await sheet.waitOnSpreadsheet();

    await copyUntilYearEnd({ month: '2024-11', category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202411', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202412', 'budget-cat1')).toBe(5000);
    expect(await getSheetValue('budget202501', 'budget-cat1')).toBe(2000); // unchanged
  });
});

describe('set budget average', () => {
  let originalCurrentMonth: string | null;

  beforeEach(async () => {
    await global.emptyDatabase()();
    originalCurrentMonth = global.currentMonth;
    global.currentMonth = '2024-02';
    await setupAverageDatabase();
  });

  afterEach(async () => {
    global.currentMonth = originalCurrentMonth;
    await global.emptyDatabase()();
  });

  it('sets a single category average from complete months', async () => {
    await setNMonthAvg({ month: '2024-04', N: 3, category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(600);
  });

  it('sets a single category average from the first activity month', async () => {
    await setBudget({ category: 'cat1', month: '2023-12', amount: 1000 });

    await setNMonthAvg({ month: '2024-04', N: 3, category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(600);
  });

  it('rounds a single category average to an integer amount', async () => {
    await db.insertTransaction({
      date: '2023-12-20',
      amount: -100,
      account: 'account1',
      category: 'cat1',
    });
    await sheet.waitOnSpreadsheet();

    await setNMonthAvg({ month: '2024-04', N: 3, category: 'cat1' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(633);
  });

  it('sets a bulk 3 month average from complete months', async () => {
    await set3MonthAvg({ month: '2024-04' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(600);
  });

  it('sets a bulk 3 month average from the first activity month', async () => {
    await setBudget({ category: 'cat1', month: '2023-12', amount: 1000 });

    await set3MonthAvg({ month: '2024-04' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(600);
  });
});

describe('coverOverbudgeted', () => {
  beforeEach(global.emptyDatabase());
  afterEach(global.emptyDatabase());

  it('fully covers the overbudget when category has sufficient leftover', async () => {
    // Setup: cat1 has 100 leftover, overbudget is 90
    await prepareDatabase();

    await coverOverbudgeted({
      month: '2024-02',
      category: 'cat1',
      currencyCode: 'USD',
    });
    await sheet.waitOnSpreadsheet();

    const sheetName = 'budget202402';
    expect(await getSheetValue(sheetName, 'to-budget')).toBe(0);
    expect(await getSheetValue(sheetName, 'leftover-cat1')).toBe(10);
  });

  it('partially covers the overbudget when category leftover is insufficient', async () => {
    // Setup: cat3 has 10 leftover, overbudget is 90
    await prepareDatabase();

    await coverOverbudgeted({
      month: '2024-02',
      category: 'cat3',
      currencyCode: 'USD',
    });
    await sheet.waitOnSpreadsheet();

    const sheetName = 'budget202402';
    expect(await getSheetValue(sheetName, 'to-budget')).toBe(-80);
    expect(await getSheetValue(sheetName, 'leftover-cat3')).toBe(0);
  });
});

// Setup: 2024-02, is 90 overbudgeted
// with balances of cat1 = 100, cat2 = -20, cat3 = 10
async function prepareDatabase() {
  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategory({
    id: 'income-cat',
    name: 'Income',
    cat_group: 'income-group',
    is_income: 1,
  });

  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: 'cat1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0,
  });
  await db.insertCategory({
    id: 'cat2',
    name: 'cat2',
    cat_group: 'group1',
    is_income: 0,
  });
  await db.insertCategory({
    id: 'cat3',
    name: 'cat3',
    cat_group: 'group1',
    is_income: 0,
  });

  await setBudget({ category: 'cat1', month: '2024-01', amount: 100 });
  await setBudget({ category: 'cat2', month: '2024-01', amount: -20 });
  await setBudget({ category: 'cat3', month: '2024-01', amount: 10 });

  await sheet.loadSpreadsheet(db);
  await budget.createBudget(['2024-01', '2024-02']);

  await setCategoryCarryover({
    startMonth: '2024-01',
    category: 'cat2',
    flag: true,
  });
  await sheet.waitOnSpreadsheet();
}

async function setupAverageDatabase() {
  await db.insertAccount({ id: 'account1', name: 'Account 1' });

  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: 'cat1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0,
  });

  await sheet.loadSpreadsheet(db);
  await budget.createBudget([
    '2023-11',
    '2023-12',
    '2024-01',
    '2024-02',
    '2024-03',
    '2024-04',
  ]);

  await db.insertTransaction({
    date: '2023-11-15',
    amount: -300,
    account: 'account1',
    category: 'cat1',
  });
  await db.insertTransaction({
    date: '2023-12-15',
    amount: -600,
    account: 'account1',
    category: 'cat1',
  });
  await db.insertTransaction({
    date: '2024-01-15',
    amount: -900,
    account: 'account1',
    category: 'cat1',
  });
  await db.insertTransaction({
    date: '2024-02-15',
    amount: -3000,
    account: 'account1',
    category: 'cat1',
  });
  await db.insertTransaction({
    date: '2024-03-15',
    amount: -1200,
    account: 'account1',
    category: 'cat1',
  });

  await sheet.waitOnSpreadsheet();
}

async function setupAutoHoldDatabase({
  income,
  incomeByMonth = {},
  budgetedByMonth,
  spendingByMonth = {},
  months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05'],
}: {
  income: number;
  incomeByMonth?: Record<string, number>;
  budgetedByMonth: Record<string, number>;
  spendingByMonth?: Record<string, number>;
  months?: string[];
}) {
  await db.insertAccount({ id: 'account1', name: 'Account 1' });

  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategory({
    id: 'income-cat',
    name: 'Income',
    cat_group: 'income-group',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: 'cat1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0,
  });

  await sheet.loadSpreadsheet(db);
  await budget.createBudget(months);

  await db.insertTransaction({
    date: '2024-01-15',
    amount: income,
    account: 'account1',
    category: 'income-cat',
  });

  for (const [month, amount] of Object.entries(incomeByMonth)) {
    await db.insertTransaction({
      date: `${month}-15`,
      amount,
      account: 'account1',
      category: 'income-cat',
    });
  }

  for (const [month, amount] of Object.entries(budgetedByMonth)) {
    await setBudget({ category: 'cat1', month, amount });
  }

  for (const [month, amount] of Object.entries(spendingByMonth)) {
    await db.insertTransaction({
      date: `${month}-15`,
      amount: -amount,
      account: 'account1',
      category: 'cat1',
    });
  }

  await sheet.waitOnSpreadsheet();
}
