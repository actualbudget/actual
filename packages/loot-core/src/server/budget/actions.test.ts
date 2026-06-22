// @ts-strict-ignore
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import { runHandler } from '#server/mutators';
import * as sheet from '#server/sheet';
import { app as transactionsApp } from '#server/transactions/app';
import { clearUndo, undo } from '#server/undo';

import {
  copyUntilYearEnd,
  coverOverbudgeted,
  getSheetValue,
  isFutureBufferModeActive,
  recalculateFutureBuffer,
  set3MonthAvg,
  setBudget,
  setBuffer,
  setCategoryCarryover,
  setNMonthAvg,
} from './actions';
import { app } from './app';
import * as budget from './base';

describe('future buffer mode', () => {
  let originalCurrentMonth: string | null;

  beforeEach(async () => {
    await global.emptyDatabase()();
    clearUndo();
    originalCurrentMonth = global.currentMonth;
    global.currentMonth = '2024-03';
  });

  afterEach(async () => {
    global.currentMonth = originalCurrentMonth;
    clearUndo();
    await global.emptyDatabase()();
  });

  it('no-ops when prefs are missing or inactive and when using a tracking budget', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await setBuffer('2024-03', 111);
    await setBuffer('2024-04', 222);
    await sheet.waitOnSpreadsheet();

    expect(isFutureBufferModeActive()).toBe(false);
    await recalculateFutureBuffer();
    expect(await getBuffered('2024-03')).toBe(111);
    expect(await getBuffered('2024-04')).toBe(222);

    setPreference('flags.futureBufferMode', 'true');
    setPreference('futureBufferMode', 'manual');

    expect(isFutureBufferModeActive()).toBe(false);
    await recalculateFutureBuffer();
    expect(await getBuffered('2024-03')).toBe(111);
    expect(await getBuffered('2024-04')).toBe(222);

    setPreference('futureBufferMode', 'automatic');
    setPreference('budgetType', 'tracking');

    expect(isFutureBufferModeActive()).toBe(false);
    await recalculateFutureBuffer();
    expect(await getBuffered('2024-03')).toBe(111);
    expect(await getBuffered('2024-04')).toBe(222);
  });

  it('persists automatic and recalculates when enabled through the handler', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await setSingleFutureMonthAmounts();
    setPreference('flags.futureBufferMode', 'true');

    await runHandler(app.handlers['budget/set-future-buffer-mode'], {
      mode: 'automatic',
    });

    expect(getPreference('futureBufferMode')).toBe('automatic');
    expect(await getBuffered('2024-03')).toBe(42000);
    expect(await getBuffered('2024-04')).toBe(0);
  });

  it('persists manual and leaves buffers unchanged when disabled through the handler', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await setSingleFutureMonthAmounts();
    setPreference('flags.futureBufferMode', 'true');

    await runHandler(app.handlers['budget/set-future-buffer-mode'], {
      mode: 'automatic',
    });
    const currentBuffer = await getBuffered('2024-03');
    const futureBuffer = await getBuffered('2024-04');

    await runHandler(app.handlers['budget/set-future-buffer-mode'], {
      mode: 'manual',
    });

    expect(getPreference('futureBufferMode')).toBe('manual');
    expect(await getBuffered('2024-03')).toBe(currentBuffer);
    expect(await getBuffered('2024-04')).toBe(futureBuffer);
  });

  it('uses backward-pass math for one future month', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await setSingleFutureMonthAmounts();
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['budget/recalculate-future-buffer']);

    expect(await getBuffered('2024-03')).toBe(42000);
    expect(await getBuffered('2024-04')).toBe(0);
  });

  it('uses backward-pass math for multiple future months', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04', '2024-05']);
    await setBudget({ category: 'cat1', month: '2024-04', amount: 60000 });
    await db.insertTransaction({
      date: '2024-04-01',
      amount: 10000,
      account: 'account1',
      category: 'income-cat',
    });
    await setBudget({ category: 'cat1', month: '2024-05', amount: 30000 });
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();

    await recalculateFutureBuffer();

    expect(await getBuffered('2024-03')).toBe(80000);
    expect(await getBuffered('2024-04')).toBe(30000);
    expect(await getBuffered('2024-05')).toBe(0);
  });

  it('can make to-budget negative', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await setSingleFutureMonthAmounts();
    enableFutureBufferModePrefs();

    await recalculateFutureBuffer();

    expect(await getBuffered('2024-03')).toBe(42000);
    expect(await getSheetValue('budget202403', 'to-budget')).toBe(-42000);
  });

  it('leaves past buffers and income carryover unchanged while clearing current and future income carryover', async () => {
    await setupFutureBufferModeDatabase([
      '2024-02',
      '2024-03',
      '2024-04',
      '2024-05',
    ]);
    await setBudget({ category: 'cat1', month: '2024-04', amount: 60000 });
    await setBudget({ category: 'cat1', month: '2024-05', amount: 30000 });
    await setBuffer('2024-02', 777);
    await setBuffer('2024-03', 888);
    await setBuffer('2024-04', 999);
    await setBuffer('2024-05', 444);
    await setCategoryCarryover({
      startMonth: '2024-02',
      category: 'income-cat',
      flag: true,
    });
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();

    await recalculateFutureBuffer();

    expect(await getBuffered('2024-02')).toBe(777);
    expect(await getCarryover('2024-02', 'income-cat')).toBe(true);
    expect(await getCarryover('2024-03', 'income-cat')).toBe(false);
    expect(await getCarryover('2024-04', 'income-cat')).toBe(false);
    expect(await getCarryover('2024-05', 'income-cat')).toBe(false);
    expect(await getBuffered('2024-03')).toBe(90000);
    expect(await getBuffered('2024-04')).toBe(30000);
    expect(await getBuffered('2024-05')).toBe(0);
  });

  it('recalculates after a future direct budget edit through the handler', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await setBuffer('2024-03', 123);
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['budget/budget-amount'], {
      category: 'cat1',
      month: '2024-04',
      amount: 50000,
    });

    expect(await getBuffered('2024-03')).toBe(50000);
    expect(await getBuffered('2024-04')).toBe(0);
  });

  it('recalculates after current-month budget edits through the handler', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await db.insertTransaction({
      date: '2024-03-01',
      amount: -10000,
      account: 'account1',
      category: 'cat1',
    });
    await setBudget({ category: 'cat1', month: '2024-03', amount: 10000 });
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();
    await recalculateFutureBuffer();
    expect(await getBuffered('2024-03')).toBe(0);

    await runHandler(app.handlers['budget/budget-amount'], {
      category: 'cat1',
      month: '2024-03',
      amount: 0,
    });
    expect(await getBuffered('2024-03')).toBe(10000);

    await runHandler(app.handlers['budget/budget-amount'], {
      category: 'cat1',
      month: '2024-03',
      amount: 10000,
    });
    expect(await getBuffered('2024-03')).toBe(0);
  });

  it('does not recalculate after past budget edits through the handler', async () => {
    await setupFutureBufferModeDatabase(['2024-02', '2024-03', '2024-04']);
    await setBudget({ category: 'cat1', month: '2024-04', amount: 50000 });
    await setBuffer('2024-03', 123);
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['budget/budget-amount'], {
      category: 'cat2',
      month: '2024-02',
      amount: 2000,
    });
    expect(await getBuffered('2024-03')).toBe(123);
  });

  it('recalculates after covering current-month overspending through the handler', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await db.insertTransaction({
      date: '2024-03-01',
      amount: -10000,
      account: 'account1',
      category: 'cat1',
    });
    await setBudget({ category: 'cat2', month: '2024-03', amount: 20000 });
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();
    await recalculateFutureBuffer();
    expect(await getBuffered('2024-03')).toBe(10000);

    await runHandler(app.handlers['budget/cover-overspending'], {
      month: '2024-03',
      to: 'cat1',
      from: 'cat2',
      currencyCode: 'USD',
    });

    expect(await getSheetValue('budget202403', 'leftover-cat1')).toBe(0);
    expect(await getBuffered('2024-03')).toBe(0);
  });

  it('recalculates after adding, deleting, and recategorizing current-month transactions through the handler', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await setBudget({ category: 'cat2', month: '2024-03', amount: 20000 });
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();

    await runHandler(transactionsApp.handlers['transaction-add'], {
      id: 'transaction1',
      date: '2024-03-01',
      amount: -10000,
      account: 'account1',
      category: 'cat1',
    });
    expect(await getBuffered('2024-03')).toBe(10000);

    await runHandler(transactionsApp.handlers['transaction-update'], {
      id: 'transaction1',
      date: '2024-03-01',
      amount: -10000,
      account: 'account1',
      category: 'cat2',
    });
    expect(await getBuffered('2024-03')).toBe(0);

    await runHandler(transactionsApp.handlers['transaction-update'], {
      id: 'transaction1',
      date: '2024-03-01',
      amount: -10000,
      account: 'account1',
      category: 'cat1',
    });
    expect(await getBuffered('2024-03')).toBe(10000);

    await runHandler(transactionsApp.handlers['transaction-delete'], {
      id: 'transaction1',
    });
    expect(await getBuffered('2024-03')).toBe(0);
  });

  it('does not recalculate from future handlers for tracking budgets', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    setPreference('flags.futureBufferMode', 'true');
    setPreference('futureBufferMode', 'automatic');
    setPreference('budgetType', 'tracking');
    await setBuffer('2024-03', 123);

    await runHandler(app.handlers['budget/budget-amount'], {
      category: 'cat1',
      month: '2024-04',
      amount: 50000,
    });

    expect(await getBuffered('2024-03')).toBe(123);
  });

  it('recalculates for copy-until-year-end when it touches a current or future month', async () => {
    global.currentMonth = '2024-02';
    await setupFutureBufferModeDatabase(['2024-01', '2024-02', '2024-03']);
    await setBudget({ category: 'cat1', month: '2024-01', amount: 50000 });
    await setBuffer('2024-02', 123);
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['budget/copy-until-year-end'], {
      month: '2024-01',
      category: 'cat1',
    });

    expect(await getSheetValue('budget202403', 'budget-cat1')).toBe(50000);
    expect(await getBuffered('2024-02')).toBe(50000);

    global.currentMonth = '2024-03';
    await setBuffer('2024-03', 456);

    await runHandler(app.handlers['budget/copy-until-year-end'], {
      month: '2024-02',
      category: 'cat1',
    });

    expect(await getBuffered('2024-03')).toBe(0);
  });

  it('recalculates after a representative future multi-category budget action', async () => {
    global.currentMonth = '2024-02';
    await setupAverageDatabase();
    await setBuffer('2024-02', 123);
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['budget/set-3month-avg'], {
      month: '2024-04',
    });

    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(600);
    expect(await getBuffered('2024-02')).toBe(4800);
    expect(await getBuffered('2024-03')).toBe(1800);
    expect(await getBuffered('2024-04')).toBe(0);
  });

  it('recalculates when a new future budget month is created through budget bounds', async () => {
    await setupFutureBufferModeDatabase(['2024-03']);
    await setBudget({ category: 'cat1', month: '2024-04', amount: 50000 });
    await setBuffer('2024-03', 123);
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['get-budget-bounds']);

    expect(await getBuffered('2024-03')).toBe(50000);
  });

  it('prewarms manual, auto, and selected buffered summary cells', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);

    const values = await runHandler(app.handlers['envelope-budget-month'], {
      month: '2024-03',
    });

    expect(values.map(value => value.name)).toEqual(
      expect.arrayContaining([
        'budget202403!buffered',
        'budget202403!buffered-auto',
        'budget202403!buffered-selected',
      ]),
    );
  });

  it('prevents direct current and future hold, reset, and income carryover changes while active', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    await db.insertTransaction({
      date: '2024-03-01',
      amount: 10000,
      account: 'account1',
      category: 'income-cat',
    });
    await setBuffer('2024-03', 0);
    await setBuffer('2024-04', 999);
    await sheet.waitOnSpreadsheet();
    enableFutureBufferModePrefs();

    const held = await runHandler(app.handlers['budget/hold-for-next-month'], {
      month: '2024-03',
      amount: 5000,
    });
    await runHandler(app.handlers['budget/reset-hold'], { month: '2024-04' });
    expect(await getBuffered('2024-04')).toBe(999);

    await runHandler(app.handlers['budget/set-carryover'], {
      startMonth: '2024-03',
      category: 'income-cat',
      flag: true,
    });

    expect(held).toBe(false);
    expect(await getBuffered('2024-03')).toBe(0);
    expect(await getBuffered('2024-04')).toBe(0);
    expect(await getCarryover('2024-03', 'income-cat')).toBe(false);
    expect(await getCarryover('2024-04', 'income-cat')).toBe(false);
  });

  it('caps past income carryover changes so current and future income carryover remains disabled while active', async () => {
    await setupFutureBufferModeDatabase(['2024-02', '2024-03', '2024-04']);
    await setCategoryCarryover({
      startMonth: '2024-02',
      category: 'income-cat',
      flag: true,
    });
    await sheet.waitOnSpreadsheet();
    expect(await getCarryover('2024-03', 'income-cat')).toBe(true);
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['budget/set-carryover'], {
      startMonth: '2024-02',
      category: 'income-cat',
      flag: true,
    });

    expect(await getCarryover('2024-02', 'income-cat')).toBe(true);
    expect(await getCarryover('2024-03', 'income-cat')).toBe(false);
    expect(await getCarryover('2024-04', 'income-cat')).toBe(false);
  });

  it('undoes a future budget edit and its auto recalculation together', async () => {
    await setupFutureBufferModeDatabase(['2024-03', '2024-04']);
    enableFutureBufferModePrefs();

    await runHandler(app.handlers['budget/budget-amount'], {
      category: 'cat1',
      month: '2024-04',
      amount: 50000,
    });
    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(50000);
    expect(await getBuffered('2024-03')).toBe(50000);

    await undo();
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202404', 'budget-cat1')).toBe(0);
    expect(await getBuffered('2024-03')).toBe(0);
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

async function setupFutureBufferModeDatabase(months: string[]) {
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
  await db.insertCategory({
    id: 'cat2',
    name: 'cat2',
    cat_group: 'group1',
    is_income: 0,
  });

  await sheet.loadSpreadsheet(db);
  await budget.createBudget(months);
}

async function setSingleFutureMonthAmounts() {
  await db.insertTransaction({
    date: '2024-04-01',
    amount: 10000,
    account: 'account1',
    category: 'income-cat',
  });
  await db.insertTransaction({
    date: '2024-03-15',
    amount: -2000,
    account: 'account1',
    category: 'cat2',
  });
  await setBudget({ category: 'cat1', month: '2024-04', amount: 50000 });
  await sheet.waitOnSpreadsheet();
}

function setPreference(id: string, value: string) {
  db.runQuery('INSERT OR REPLACE INTO preferences (id, value) VALUES (?, ?)', [
    id,
    value,
  ]);
}

function getPreference(id: string) {
  return db.firstSync<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    [id],
  )?.value;
}

function enableFutureBufferModePrefs() {
  setPreference('flags.futureBufferMode', 'true');
  setPreference('futureBufferMode', 'automatic');
}

async function getBuffered(month: string) {
  return (
    await db.first<Pick<db.DbZeroBudgetMonth, 'buffered'>>(
      'SELECT buffered FROM zero_budget_months WHERE id = ?',
      [month],
    )
  )?.buffered;
}

async function getCarryover(month: string, category: string) {
  return (
    ((
      await db.first<Pick<db.DbZeroBudget, 'carryover'>>(
        'SELECT carryover FROM zero_budgets WHERE month = ? AND category = ?',
        [parseInt(month.replace('-', '')), category],
      )
    )?.carryover ?? 0) === 1
  );
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
