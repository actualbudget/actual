import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { undo, withUndo } from '#server/undo';
import * as monthUtils from '#shared/months';

import {
  getSheetValue,
  resetIncomeCarryover,
  setBudget,
  setCategoryCarryover,
} from './actions';
import { createAllBudgets } from './base';
import { cleanupTemplate } from './cleanup-template';

const MONTHS_2027 = [
  '2027-01',
  '2027-02',
  '2027-03',
  '2027-04',
  '2027-05',
  '2027-06',
];

function carryover(month: string, category: string) {
  return sheet.getCellValue(
    monthUtils.sheetForMonth(month),
    `carryover-${category}`,
  );
}

function budgetRow(table: string, month: string, category: string) {
  return db.firstSync<db.DbZeroBudget>(
    `SELECT * FROM ${table} WHERE month = ? AND category = ?`,
    [parseInt(month.replace('-', '')), category],
  );
}

// Rollover is turned on in Jan 2026 while the budget ends at Dec 2026, then
// the clock moves to Jun 2026 so Jan–Jun 2027 get created with no rows.
async function setup(
  budgetType: 'envelope' | 'tracking',
  categories = ['card'],
) {
  if (budgetType === 'tracking') {
    db.runQuery(
      "INSERT INTO preferences (id, value) VALUES ('budgetType', 'tracking')",
    );
  }

  await db.insertAccount({ id: 'account', name: 'Account' });
  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategory({
    id: 'income',
    name: 'Income',
    cat_group: 'income-group',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategory({
    id: 'card',
    name: 'Credit card',
    cat_group: 'group',
  });
  await db.insertTransaction({
    date: '2026-01-15',
    amount: -100000,
    account: 'account',
    category: 'card',
  });

  global.currentMonth = '2025-12';
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = budgetType;
  await createAllBudgets();

  for (const category of categories) {
    await setCategoryCarryover({ startMonth: '2026-01', category, flag: true });
  }

  global.currentMonth = '2026-06';
  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
}

describe('carryover', () => {
  beforeEach(global.emptyDatabase());
  afterEach(() => {
    global.currentMonth = null;
  });

  it('keeps rolling over past the months that have rows', async () => {
    await setup('envelope');

    for (const month of MONTHS_2027) {
      const sheetName = monthUtils.sheetForMonth(month);
      expect(carryover(month, 'card')).toBe(true);
      expect(await getSheetValue(sheetName, 'leftover-card')).toBe(-100000);
      expect(await getSheetValue(sheetName, 'last-month-overspent')).toBe(0);
    }
  });

  it('keeps rolling over past the months that have rows in tracking budgets', async () => {
    await setup('tracking');

    for (const month of MONTHS_2027) {
      const sheetName = monthUtils.sheetForMonth(month);
      expect(carryover(month, 'card')).toBe(true);
      expect(await getSheetValue(sheetName, 'leftover-card')).toBe(-100000);
    }
  });

  it('inherits the flag in a budgeted month, and undo restores the inherited flag', async () => {
    await setup('envelope');

    await setBudget({ category: 'card', month: '2027-03', amount: 5000 });
    await withUndo(() =>
      setBudget({ category: 'card', month: '2027-05', amount: 5000 }),
    );
    await sheet.waitOnSpreadsheet();

    expect(budgetRow('zero_budgets', '2027-03', 'card')?.carryover).toBeNull();
    expect(carryover('2027-03', 'card')).toBe(true);
    expect(carryover('2027-04', 'card')).toBe(true);

    await undo();
    await sheet.waitOnSpreadsheet();

    const undone = budgetRow('zero_budgets', '2027-05', 'card');
    expect(undone?.amount).toBe(0);
    expect(undone?.carryover).toBeNull();
    expect(carryover('2027-05', 'card')).toBe(true);
  });

  it('turns rollover off from the chosen month on', async () => {
    await setup('envelope');

    await setCategoryCarryover({
      startMonth: '2027-02',
      category: 'card',
      flag: false,
    });
    await sheet.waitOnSpreadsheet();

    expect(carryover('2027-01', 'card')).toBe(true);
    for (const month of MONTHS_2027.slice(1)) {
      expect(carryover(month, 'card')).toBe(false);
    }
  });

  it('resets income auto-hold for one month only', async () => {
    await setup('envelope', ['card', 'income']);
    await setBudget({ category: 'income', month: '2027-02', amount: 0 });
    await sheet.waitOnSpreadsheet();

    await resetIncomeCarryover({ month: '2027-02' });
    await sheet.waitOnSpreadsheet();

    expect(carryover('2027-02', 'income')).toBe(false);
    expect(budgetRow('zero_budgets', '2027-03', 'income')?.carryover).toBe(1);
    expect(carryover('2027-04', 'income')).toBe(true);
  });

  it('cleanup leaves an inherited rollover category overspent', async () => {
    await setup('envelope');
    await db.insertTransaction({
      date: '2027-03-01',
      amount: 500000,
      account: 'account',
      category: 'income',
    });
    await sheet.waitOnSpreadsheet();

    await cleanupTemplate({ month: '2027-03' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202703', 'budget-card')).toBe(0);
  });
});
