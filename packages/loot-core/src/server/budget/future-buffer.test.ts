import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as db from '#server/db';
import { handlers } from '#server/main';
import { runMutator } from '#server/mutators';
import { app as preferencesApp } from '#server/preferences/app';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { undo, withUndo } from '#server/undo';
import * as monthUtils from '#shared/months';

import {
  getSheetValue,
  holdForNextMonth,
  resetHold,
  resetIncomeCarryover,
  setBudget,
  setBuffer,
  setCategoryCarryover,
} from './actions';
import { createBudget } from './base';
import { freezeClosedMonths } from './freeze';
import { setFutureBufferMode } from './future-buffer-mode';

vi.mock('#server/post');

const WINDOW = ['2026-10', '2026-11', '2026-12'];

function buffer(month: string) {
  return getSheetValue(monthUtils.sheetForMonth(month), 'buffered-selected');
}

function toBudget(month: string) {
  return getSheetValue(monthUtils.sheetForMonth(month), 'to-budget');
}

function monthRow(month: string) {
  return db.firstSync<db.DbZeroBudgetMonth>(
    'SELECT * FROM zero_budget_months WHERE id = ?',
    [month],
  );
}

function setMode(mode: 'manual' | 'automatic') {
  return runMutator(() => setFutureBufferMode({ mode }));
}

async function setup() {
  global.currentMonth = '2026-10';
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
  await db.insertCategory({ id: 'bills', name: 'Bills', cat_group: 'group' });
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = 'envelope';
  await createBudget(WINDOW);
  await db.insertTransaction({
    date: '2026-10-01',
    amount: 520000,
    account: 'account',
    category: 'income',
  });
  await setBudget({ category: 'bills', month: '2026-10', amount: 300000 });
  await setBudget({ category: 'bills', month: '2026-11', amount: 150000 });
  await setBudget({ category: 'bills', month: '2026-12', amount: 50000 });
  await setMode('automatic');
  await sheet.waitOnSpreadsheet();
}

describe('future buffer', () => {
  beforeEach(global.emptyDatabase());
  afterEach(() => {
    global.currentMonth = null;
  });

  it('holds what the future months need', async () => {
    await setup();

    expect(await buffer('2026-10')).toBe(200000);
    expect(await buffer('2026-11')).toBe(50000);
    // The last month in the window has nothing after it
    expect(await buffer('2026-12')).toBe(0);
    for (const month of WINDOW) {
      expect(await toBudget(month)).toBe(20000);
    }

    // Income in Nov counts, but Nov's surplus isn't lent back to Oct
    await db.insertTransaction({
      id: 'nov-income',
      date: '2026-11-10',
      amount: 100000,
      account: 'account',
      category: 'income',
    });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(100000);
    expect(await toBudget('2026-10')).toBe(120000);

    await db.updateTransaction({ id: 'nov-income', amount: 300000 });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(0);
    expect(await toBudget('2026-10')).toBe(220000);
    expect(await toBudget('2026-11')).toBe(320000);

    // No cap: To Budget goes negative
    await setBudget({ category: 'bills', month: '2026-11', amount: 1000000 });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(750000);
    expect(await toBudget('2026-10')).toBe(-530000);
  });

  it('keeps a closed month frozen through later edits, undo and repeated freezes', async () => {
    await setup();
    global.currentMonth = '2026-11';
    await runMutator(freezeClosedMonths);
    expect(monthRow('2026-10')).toEqual({
      id: '2026-10',
      buffered: 200000,
      frozen: 1,
    });

    await withUndo(() =>
      setBudget({ category: 'bills', month: '2026-11', amount: 250000 }),
    );
    await sheet.waitOnSpreadsheet();
    await runMutator(freezeClosedMonths);
    expect(await buffer('2026-10')).toBe(200000);
    expect(await toBudget('2026-10')).toBe(20000);
    expect(await toBudget('2026-11')).toBe(-80000);
    await undo();
    await sheet.waitOnSpreadsheet();
    expect(monthRow('2026-10')?.frozen).toBe(1);
    expect(await buffer('2026-10')).toBe(200000);

    await resetHold({ month: '2026-10' });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(0);
    expect(await toBudget('2026-10')).toBe(220000);
    expect(monthRow('2026-10')?.frozen).toBe(1);
  });

  it('preserves holds when leaving automatic mode', async () => {
    await setup();
    await setMode('manual');
    await setBuffer('2026-10', 70000);
    await setMode('automatic');
    await sheet.waitOnSpreadsheet();
    expect(monthRow('2026-10')?.buffered).toBe(70000);
    expect(await toBudget('2026-10')).toBe(20000);

    expect(await holdForNextMonth({ month: '2026-10', amount: 10000 })).toBe(
      false,
    );
    expect(await resetHold({ month: '2026-10' })).toBe(false);
    expect(await resetIncomeCarryover({ month: '2026-10' })).toBe(false);
    await prefs.loadPrefs();
    expect(
      (await handlers['api/budget-month']({ month: '2026-10' })).forNextMonth,
    ).toBe(200000);

    await setCategoryCarryover({
      startMonth: '2026-10',
      category: 'income',
      flag: true,
    });
    await sheet.waitOnSpreadsheet();
    const before = await Promise.all(WINDOW.map(toBudget));
    await setMode('manual');
    await sheet.waitOnSpreadsheet();
    expect(
      await db.first(
        "SELECT value FROM preferences WHERE id = 'futureBufferMode'",
      ),
    ).toEqual({ value: null });
    expect(monthRow('2026-10')?.buffered).toBe(200000);
    expect(monthRow('2026-11')?.buffered).toBe(50000);
    expect(
      await db.all('SELECT carryover FROM zero_budgets WHERE category = ?', [
        'income',
      ]),
    ).toEqual(expect.arrayContaining([{ carryover: 0 }]));
    expect(
      await db.first(
        'SELECT * FROM zero_budgets WHERE category = ? AND carryover = 1',
        ['income'],
      ),
    ).toBeNull();
    expect(await Promise.all(WINDOW.map(toBudget))).toEqual(before);
  });

  it('snapshots envelope holds before switching to Tracking', async () => {
    await setup();
    await runMutator(() =>
      preferencesApp.handlers['preferences/save']({
        id: 'budgetType',
        value: 'tracking',
      }),
    );
    await sheet.waitOnSpreadsheet();
    expect(
      await db.first(
        "SELECT value FROM preferences WHERE id = 'futureBufferMode'",
      ),
    ).toEqual({ value: null });
    expect(monthRow('2026-10')?.buffered).toBe(200000);
    expect(monthRow('2026-11')?.buffered).toBe(50000);
  });
});
