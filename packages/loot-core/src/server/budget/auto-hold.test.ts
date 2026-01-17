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

  // todo assert initial budget values?

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
    totalBudgeted: sheet.getCellValue(sheetName, 'total-budgeted'),
    buffered: sheet.getCellValue(sheetName, 'buffered'),
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

    expect(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: 0,
      buffered: 5000,
      toBudget: 5000,
    });

    expect(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: -5000,
      buffered: 0,
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

    expect(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: -7500,
      buffered: 2500,
      toBudget: 0,
    });

    expect(getMonthValues(nextMonth)).toEqual({
      availableFunds: 2500,
      totalBudgeted: -5000,
      buffered: 0,
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

    expect(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: -10000,
      buffered: 0,
      toBudget: 0,
    });

    expect(getMonthValues(nextMonth)).toEqual({
      availableFunds: 0,
      totalBudgeted: -5000,
      buffered: 0,
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

    expect(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: 0,
      buffered: 5000,
      toBudget: 5000,
    });

    expect(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: 0,
      buffered: 5000,
      toBudget: 5000,
    });

    expect(getMonthValues(followingMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: -5000,
      buffered: 0,
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

    // todo assert that funds were held

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    expect(getMonthValues(currentMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: 0,
      buffered: 0,
      toBudget: 10000,
    });

    expect(getMonthValues(nextMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: 0,
      buffered: 0,
      toBudget: 10000,
    });

    expect(getMonthValues(followingMonth)).toEqual({
      availableFunds: 10000,
      totalBudgeted: 0,
      buffered: 0,
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

    // todo assert that funds were held

    await db.insertTransaction({
      date: `${CURRENT_MONTH}-20`,
      amount: -15000,
      account: 'account-1',
      category: expenseCategoryId,
    });
    await sheet.waitOnSpreadsheet();

    const currentValues = getMonthValues(currentMonth);
    expect(currentValues.buffered).toBe(5000);
    // todo assert current month overspend amount
  });

  it('auto-holds new income for nearest overbudgeted future month when current month is not overbudgeted', async () => {
    const {
      currentMonth,
      nextMonth,
      incomeCategoryId,
      expenseCategoryId,
    } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 12000,
    });
    await sheet.waitOnSpreadsheet();

    await addIncome({ amount: 3000, incomeCategoryId });
    await sheet.waitOnSpreadsheet();

    const currentValues = getMonthValues(currentMonth);
    expect(currentValues.buffered).toBe(12000);
    expect(currentValues.toBudget).toBe(1000);

    const nextValues = getMonthValues(nextMonth);
    expect(nextValues.toBudget).toBe(0);
  });

  it('does not auto-hold new income when current month is overbudgeted', async () => {
    const {
      currentMonth,
      nextMonth,
      incomeCategoryId,
      expenseCategoryId,
    } = await setupBudget();

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

    // todo assert that no funds were held

    await addIncome({ amount: 3000, incomeCategoryId });
    await sheet.waitOnSpreadsheet();

    const currentValues = getMonthValues(currentMonth);
    expect(currentValues.buffered).toBe(1000);

    const nextValues = getMonthValues(nextMonth);
    expect(nextValues.toBudget).toBe(-11000);
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

    // todo verify how much is overbudgeted
    // todo verify how much is buffered

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 8000,
    });
    await sheet.waitOnSpreadsheet();

    // todo verify how much is overbudgeted
    // todo verify how much is buffered

    await addIncome({ amount: 15000, incomeCategoryId });
    await sheet.waitOnSpreadsheet();

    const currentValues = getMonthValues(currentMonth);
    expect(currentValues.totalBudgeted).toBe(0);
    expect(currentValues.toBudget).toBe(5000);
    expect(currentValues.buffered).toBe(20000);

    const nextValues = getMonthValues(nextMonth);
    expect(nextValues.totalBudgeted).toBe(-12000);
    expect(nextValues.toBudget).toBe(0);
    expect(nextValues.buffered).toBe(8000);

    const followingValues = getMonthValues(followingMonth);
    expect(followingValues.totalBudgeted).toBe(-8000);
    expect(followingValues.toBudget).toBe(0);
    expect(followingValues.buffered).toBe(0);
  });

  it('unbudgeting can override manual holds when auto-hold is released', async () => {
    const { currentMonth, nextMonth, followingMonth, expenseCategoryId } =
      await setupBudget();

    await budgetActions.holdForNextMonth({
      month: currentMonth,
      amount: 3000,
    });
    await sheet.waitOnSpreadsheet();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    // todo assert buffered funds

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: followingMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    const currentValues = getMonthValues(currentMonth);
    expect(currentValues.buffered).toBe(0);

    const nextValues = getMonthValues(nextMonth);
    expect(nextValues.buffered).toBe(0);

    const followingValues = getMonthValues(followingMonth);
    expect(followingValues.buffered).toBe(0);
  });

  it('unbudgeting may override manual holds even without additional auto-hold', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.holdForNextMonth({
      month: currentMonth,
      amount: 4000,
    });
    await sheet.waitOnSpreadsheet();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 2000,
    });
    await sheet.waitOnSpreadsheet();

    // todo will buffered amount be updated to 2000 by auto-hold?

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    const currentValues = getMonthValues(currentMonth);
    expect(currentValues.buffered).toBe(0);
  });

  it('unbudgeting releases auto-held funds when no manual holds exist', async () => {
    const { currentMonth, nextMonth, expenseCategoryId } = await setupBudget();

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 5000,
    });
    await sheet.waitOnSpreadsheet();

    // todo assert funds were buffered

    await budgetActions.setBudget({
      category: expenseCategoryId,
      month: nextMonth,
      amount: 0,
    });
    await sheet.waitOnSpreadsheet();

    const currentValues = getMonthValues(currentMonth);
    expect(currentValues.buffered).toBe(0);
  });
});
