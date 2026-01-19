// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import * as db from '../db';
import * as sheet from '../sheet';

import * as budgetActions from './actions';
import { createAllBudgets } from './base';

const CURRENT_MONTH = '2017-01';

beforeEach(async () => {
  await global.emptyDatabase()();
  global.currentMonth = CURRENT_MONTH;
});

afterEach(() => {
  global.currentMonth = null;
});

async function setupBudget({ incomeAmount = 10000 } = {}) {
  await sheet.loadSpreadsheet(db);

  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'expense-group', name: 'Expenses' });

  const incomeCategoryId = await db.insertCategory({
    name: 'Income',
    cat_group: 'income-group',
    is_income: 1,
  });

  const expenseCategoryId = await db.insertCategory({
    name: 'Food',
    cat_group: 'expense-group',
  });

  await db.insertAccount({ id: 'account-1', name: 'Checking' });

  if (incomeAmount !== 0) {
    await db.insertTransaction({
      date: `${CURRENT_MONTH}-15`,
      amount: incomeAmount,
      account: 'account-1',
      category: incomeCategoryId,
    });
  }

  await createAllBudgets();
  await sheet.waitOnSpreadsheet();

  expect.soft(getMonthValues(CURRENT_MONTH)).toEqual({
    availableFunds: incomeAmount,
    lastMonthOverspent: 0,
    totalBudgeted: -0,
    buffered: 0,
    bufferedAuto: 0,
    toBudget: incomeAmount,
  });

  return {
    currentMonth: CURRENT_MONTH,
    nextMonth: monthUtils.nextMonth(CURRENT_MONTH),
    followingMonth: monthUtils.addMonths(CURRENT_MONTH, 2),
    incomeCategoryId,
    expenseCategoryId,
  };
}

async function addIncome({
  amount,
  incomeCategoryId,
  day = '25',
}: {
  amount: number;
  incomeCategoryId: string;
  day?: string;
}) {
  await db.insertTransaction({
    date: `${CURRENT_MONTH}-${day}`,
    amount,
    account: 'account-1',
    category: incomeCategoryId,
  });
}

function getMonthValues(month: string) {
  const sheetName = monthUtils.sheetForMonth(month);
  return {
    availableFunds: sheet.getCellValue(sheetName, 'available-funds'),
    lastMonthOverspent: sheet.getCellValue(sheetName, 'last-month-overspent'),
    totalBudgeted: sheet.getCellValue(sheetName, 'total-budgeted'),
    buffered: sheet.getCellValue(sheetName, 'buffered'),
    bufferedAuto: sheet.getCellValue(sheetName, 'buffered-auto'),
    toBudget: sheet.getCellValue(sheetName, 'to-budget'),
  };
}

describe('Auto-hold for future month budgeting', () => {
  it('auto-holds when future month has all funds available', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 5000,
    });
  });

  it('auto-holds when future month has some funds available', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: currentMonth,
      amount: 7500,
    });
    await sheet.waitOnSpreadsheet();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -7500,
      buffered: 2500,
      bufferedAuto: 0,
      toBudget: 0,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 2500,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -2500,
    });
  });

  it('does not auto-hold when no funds are available', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: currentMonth,
      amount: 10000,
    });
    await sheet.waitOnSpreadsheet();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -10000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 0,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 0,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -5000,
    });
  });

  it('auto-holds across multiple months for far-future budgeting', async () => {
    const { currentMonth, nextMonth, followingMonth, expenseCategoryId } =
      await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(followingMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 5000,
    });
  });

  it('releases auto-held funds when un-budgeting future months', async () => {
    const { currentMonth, nextMonth, followingMonth, expenseCategoryId } =
      await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(followingMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });

    expect.soft(getMonthValues(followingMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });
  });

  it('does not release holds when current month overspends', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    await db.insertTransaction({
      date: `${CURRENT_MONTH}-20`,
      amount: -15000,
      account: 'account-1',
      category: expenseCategoryId,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: -15000,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -10000,
    });
  });

  it('auto-holds new income for nearest overbudgeted future month when current month is not overbudgeted', async () => {
    const { currentMonth, nextMonth, incomeCategoryId, expenseCategoryId } =
      await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 12000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 10000,
      bufferedAuto: 0,
      toBudget: 0,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -2000,
    });

    await addIncome({ amount: 3000, incomeCategoryId });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 13000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 12000,
      bufferedAuto: 0,
      toBudget: 1000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 13000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 1000,
    });
  });

  it('does not auto-hold new income when current month is overbudgeted', async () => {
    const { currentMonth, nextMonth, incomeCategoryId, expenseCategoryId } =
      await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: currentMonth,
      amount: 12000,
    });
    await sheet.waitOnSpreadsheet();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 12000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -2000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: -2000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -14000,
    });

    await addIncome({ amount: 3000, incomeCategoryId });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 13000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 1000,
      bufferedAuto: 0,
      toBudget: 0,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 1000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -11000,
    });
  });

  it('auto-holds new income across multiple overbudgeted future months', async () => {
    const {
      currentMonth,
      nextMonth,
      followingMonth,
      incomeCategoryId,
      expenseCategoryId,
    } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 12000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 10000,
      bufferedAuto: 0,
      toBudget: 0,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -2000,
    });

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 8000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 10000,
      bufferedAuto: 0,
      toBudget: 0,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -2000,
    });

    expect.soft(getMonthValues(followingMonth)).toEqual({
      availableFunds: -2000,
      lastMonthOverspent: 0,
      totalBudgeted: -8000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: -10000,
    });

    await addIncome({ amount: 15000, incomeCategoryId });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 25000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 20000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 25000,
      lastMonthOverspent: 0,
      totalBudgeted: -12000,
      buffered: 8000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(followingMonth)).toEqual({
      availableFunds: 13000,
      lastMonthOverspent: 0,
      totalBudgeted: -8000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 5000,
    });
  });

  it('unbudgeting can override manual holds when auto-hold is released', async () => {
    const { currentMonth, nextMonth, followingMonth, expenseCategoryId } =
      await setupBudget();

    await budgetActions.holdForNextMonth({
      month: currentMonth,
      amount: 3000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 3000,
      bufferedAuto: 0,
      toBudget: 7000,
    });

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(followingMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });

    expect.soft(getMonthValues(followingMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });
  });

  it('unbudgeting may override manual holds even without additional auto-hold', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.holdForNextMonth({
      month: currentMonth,
      amount: 4000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 4000,
      bufferedAuto: 0,
      toBudget: 6000,
    });

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 2000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 2000,
      bufferedAuto: 0,
      toBudget: 8000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -2000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 8000,
    });

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });
  });

  it('unbudgeting releases auto-held funds when no manual holds exist', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 5000,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    expect.soft(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -5000,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 5000,
    });

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    expect.soft(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      lastMonthOverspent: 0,
      totalBudgeted: -0,
      buffered: 0,
      bufferedAuto: 0,
      toBudget: 10000,
    });
  });
});
