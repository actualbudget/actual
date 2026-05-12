// @ts-strict-ignore
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import * as sheet from '#server/sheet';

import {
  copyUntilYearEnd,
  coverOverbudgeted,
  getSheetValue,
  setBudget,
  setCategoryCarryover,
} from './actions';
import * as budget from './base';

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
