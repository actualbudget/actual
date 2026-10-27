import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { seedCarryoverChain } from './carryover-seed';

vi.mock('#server/post');

function carryover(month: string, category = 'card') {
  return sheet.getCellValue(
    monthUtils.sheetForMonth(month),
    `carryover-${category}`,
  );
}

async function setup(budgetType: 'envelope' | 'tracking' = 'envelope') {
  await db.update('preferences', { id: 'budgetType', value: budgetType });
  await db.insertAccount({ id: 'account', name: 'Account' });
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategory({ id: 'card', name: 'Card', cat_group: 'group' });
  await db.insertCategory({
    id: 'income',
    name: 'Income',
    cat_group: 'income-group',
    is_income: 1,
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
  await setCategoryCarryover({
    startMonth: '2026-01',
    category: 'card',
    flag: true,
  });
  global.currentMonth = '2026-06';
  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
}

function budgetRow(table: string, month: number, category: string) {
  return db.firstSync<db.DbZeroBudget>(
    `SELECT * FROM ${table} WHERE month = ? AND category = ?`,
    [month, category],
  );
}

describe('carryover', () => {
  beforeEach(global.emptyDatabase());
  afterEach(() => {
    global.currentMonth = null;
  });

  it.each(['envelope', 'tracking'] as const)(
    'inherits beyond the old window until explicitly turned off (%s)',
    async budgetType => {
      await setup(budgetType);
      const table =
        budgetType === 'envelope' ? 'zero_budgets' : 'reflect_budgets';
      expect(carryover('2027-01')).toBe(true);
      expect(await getSheetValue('budget202706', 'leftover-card')).toBe(
        -100000,
      );

      await withUndo(() =>
        setBudget({ category: 'card', month: '2027-03', amount: 5000 }),
      );
      await sheet.waitOnSpreadsheet();
      expect(budgetRow(table, 202703, 'card')?.carryover).toBeNull();
      expect(carryover('2027-04')).toBe(true);
      await undo();
      await sheet.waitOnSpreadsheet();
      expect(budgetRow(table, 202703, 'card')?.carryover).toBeNull();
      expect(carryover('2027-04')).toBe(true);

      await setCategoryCarryover({
        startMonth: '2027-02',
        category: 'card',
        flag: false,
      });
      await sheet.waitOnSpreadsheet();
      expect(carryover('2027-01')).toBe(true);
      expect(carryover('2027-02')).toBe(false);
      expect(carryover('2027-06')).toBe(false);
    },
  );

  it('resets income auto-hold for one month only', async () => {
    await setup();
    await setCategoryCarryover({
      startMonth: '2026-01',
      category: 'income',
      flag: true,
    });
    await setBudget({ category: 'income', month: '2027-02', amount: 0 });
    await resetIncomeCarryover({ month: '2027-02' });
    await sheet.waitOnSpreadsheet();
    expect(carryover('2027-02', 'income')).toBe(false);
    expect(carryover('2027-03', 'income')).toBe(true);
  });

  it('seeds expired windows once without changing existing rows or open chains', async () => {
    await setup();
    global.currentMonth = '2027-02';
    for (const table of ['zero_budgets', 'reflect_budgets']) {
      await db.insert(table, {
        id: '202612-card',
        month: 202612,
        category: 'card',
        carryover: 1,
      });
      await db.insert(table, {
        id: '202701-income',
        month: 202701,
        category: 'income',
        carryover: 1,
      });
    }
    await seedCarryoverChain();
    for (const table of ['zero_budgets', 'reflect_budgets']) {
      expect(budgetRow(table, 202701, 'card')?.carryover).toBe(0);
      expect(budgetRow(table, 202702, 'income')).toBeNull();
      expect(budgetRow(table, 202612, 'card')?.carryover).toBe(1);
      db.runQuery(`DELETE FROM ${table} WHERE id = '202701-card'`);
    }
    await seedCarryoverChain();
    expect(budgetRow('zero_budgets', 202701, 'card')).toBeNull();
  });
});
