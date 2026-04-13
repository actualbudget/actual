import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import * as sheet from '#server/sheet';

import {
  coverOverbudgeted,
  getSheetValue,
  setBudget,
  setCategoryCarryover,
} from './actions';
import * as budget from './base';

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
