// @ts-strict-ignore

import * as asyncStorage from '#platform/server/asyncStorage';
import * as db from '#server/db';
import * as sheet from '#server/sheet';
import {
  batchMessages,
  registerBudgetChangeHook,
  runBudgetChangeHooks,
} from '#server/sync';
import { getCurrency } from '#shared/currencies';
import { getLocale } from '#shared/locale';
import * as monthUtils from '#shared/months';
import { integerToCurrency, safeNumber } from '#shared/util';
import type { IntegerAmount } from '#shared/util';
import type { CategoryEntity } from '#types/models';
import type { FutureBufferMode } from '#types/prefs';

export async function getSheetValue(
  sheetName: string,
  cell: string,
): Promise<number> {
  const node = sheet.getCell(sheetName, cell);
  return safeNumber(typeof node.value === 'number' ? node.value : 0);
}

export async function getSheetBoolean(
  sheetName: string,
  cell: string,
): Promise<boolean> {
  const node = sheet.getCell(sheetName, cell);
  return typeof node.value === 'boolean' ? node.value : false;
}

// We want to only allow the positive movement of money back and
// forth. buffered should never be allowed to go into the negative,
// and you shouldn't be allowed to pull non-existent money from
// leftover.
function calcBufferedAmount(
  toBudget: number,
  buffered: number,
  amount: number,
): number {
  amount = Math.min(Math.max(amount, -buffered), Math.max(toBudget, 0));
  return buffered + amount;
}

type BudgetTable = 'reflect_budgets' | 'zero_budgets';

function getBudgetTable(): BudgetTable {
  return isTrackingBudget() ? 'reflect_budgets' : 'zero_budgets';
}

export function isTrackingBudget(): boolean {
  const budgetType = db.firstSync<Pick<db.DbPreference, 'value'>>(
    `SELECT value FROM preferences WHERE id = ?`,
    ['budgetType'],
  );
  const val = budgetType ? budgetType.value : 'envelope';
  return val === 'tracking';
}

// TODO: complete list of fields.
type BudgetData = {
  is_income: 1 | 0;
  hidden: 1 | 0;
  group_hidden: 1 | 0;
  category: string;
  amount: number;
};

function getBudgetData<T extends BudgetTable>(
  table: T,
  month: string,
): Promise<BudgetData[]> {
  return db.all<
    (db.DbReflectBudget | db.DbZeroBudget) &
      Pick<
        db.DbViewCategoryWithGroupHidden,
        'is_income' | 'hidden' | 'group_hidden'
      >
  >(
    `
    SELECT b.*, c.is_income, c.hidden, g.hidden AS group_hidden
    FROM ${table} b
    LEFT JOIN categories c ON b.category = c.id
    LEFT JOIN category_groups g ON c.cat_group = g.id
    WHERE c.tombstone = 0 AND b.month = ?
  `,
    [month],
  );
}

function getAllMonths(startMonth: string): string[] {
  const { createdMonths } = sheet.get().meta();
  let latest = null;
  for (const month of createdMonths) {
    if (latest == null || month > latest) {
      latest = month;
    }
  }
  return monthUtils.rangeInclusive(startMonth, latest);
}

// TODO: Valid month format in all the functions below

export function getBudget({
  category,
  month,
}: {
  category: string;
  month: string;
}): number {
  const table = getBudgetTable();
  const existing = db.firstSync<db.DbZeroBudget | db.DbReflectBudget>(
    `SELECT * FROM ${table} WHERE month = ? AND category = ?`,
    [monthUtils.toDbMonth(month), category],
  );
  return existing ? existing.amount || 0 : 0;
}

export function setBudget({
  category,
  month,
  amount,
}: {
  category: CategoryEntity['id'];
  month: string;
  amount: unknown;
}): Promise<void> {
  amount = safeNumber(typeof amount === 'number' ? amount : 0);
  const table = getBudgetTable();

  const existing = db.firstSync<
    Pick<db.DbZeroBudget | db.DbReflectBudget, 'id'>
  >(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    monthUtils.toDbMonth(month),
    category,
  ]);
  if (existing) {
    return db.update(table, { id: existing.id, amount });
  }
  return db.insert(table, {
    id: `${monthUtils.toDbMonth(month)}-${category}`,
    month: monthUtils.toDbMonth(month),
    category,
    amount,
  });
}

export function setGoal({ month, category, goal, long_goal }): Promise<void> {
  const table = getBudgetTable();
  const existing = db.firstSync<
    Pick<db.DbZeroBudget | db.DbReflectBudget, 'id'>
  >(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    monthUtils.toDbMonth(month),
    category,
  ]);
  if (existing) {
    return db.update(table, {
      id: existing.id,
      goal,
      long_goal,
    });
  }
  return db.insert(table, {
    id: `${monthUtils.toDbMonth(month)}-${category}`,
    month: monthUtils.toDbMonth(month),
    category,
    goal,
    long_goal,
  });
}

export function setBuffer(month: string, amount: unknown): Promise<void> {
  const existing = db.firstSync<Pick<db.DbZeroBudget, 'id'>>(
    `SELECT id FROM zero_budget_months WHERE id = ?`,
    [month],
  );
  if (existing) {
    return db.update('zero_budget_months', {
      id: existing.id,
      buffered: amount,
    });
  }
  return db.insert('zero_budget_months', { id: month, buffered: amount });
}

function setCarryover(
  table: string,
  category: string,
  month: string,
  flag: boolean,
): Promise<void> {
  const existing = db.firstSync<
    Pick<db.DbZeroBudget | db.DbReflectBudget, 'id'>
  >(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    month,
    category,
  ]);
  if (existing) {
    return db.update(table, { id: existing.id, carryover: flag ? 1 : 0 });
  }
  return db.insert(table, {
    id: `${month}-${category}`,
    month,
    category,
    carryover: flag ? 1 : 0,
  });
}

export function isFutureBufferModeActive(): boolean {
  if (isTrackingBudget()) {
    return false;
  }

  const featureFlag = db.firstSync<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    ['flags.futureBufferMode'],
  );
  const budgetPreference = db.firstSync<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    ['futureBufferMode'],
  );

  return (
    featureFlag?.value === 'true' && budgetPreference?.value === 'automatic'
  );
}

function isCurrentOrFutureMonth(month: string): boolean {
  return month >= monthUtils.currentMonth();
}

async function recalculateFutureBufferImpl(): Promise<void> {
  if (!isFutureBufferModeActive()) return;

  const currentMonth = monthUtils.currentMonth();
  const { createdMonths = new Set<string>() } = sheet.get().meta();
  const managedMonths = [...(createdMonths as Set<string>)]
    .filter(month => month >= currentMonth)
    .sort();

  if (managedMonths.length === 0) {
    return;
  }

  const incomeCategories = await db.all<Pick<db.DbCategory, 'id'>>(
    'SELECT id FROM categories WHERE tombstone = 0 AND is_income = 1',
  );

  if (incomeCategories.length > 0) {
    await batchMessages(async () => {
      for (const month of managedMonths) {
        for (const category of incomeCategories) {
          await setCarryover(
            'zero_budgets',
            category.id,
            monthUtils.toDbMonth(month).toString(),
            false,
          );
        }
      }
    });
  }

  await sheet.waitOnSpreadsheet();

  const autoBuffers = new Map<string, number>();
  let nextMonthAutoBuffer = 0;

  for (let i = managedMonths.length - 1; i >= 0; i--) {
    const month = managedMonths[i];
    const nextMonth = managedMonths[i + 1];
    let autoBuffer = 0;

    if (nextMonth) {
      const sheetName = monthUtils.sheetForMonth(nextMonth);
      const totalIncome = await getSheetValue(sheetName, 'total-income');
      const lastMonthOverspent = await getSheetValue(
        sheetName,
        'last-month-overspent',
      );
      const totalBudgeted = await getSheetValue(sheetName, 'total-budgeted');

      autoBuffer = Math.round(
        Math.max(
          0,
          safeNumber(
            -(totalIncome + lastMonthOverspent + totalBudgeted) +
              nextMonthAutoBuffer,
          ),
        ),
      );
    }

    autoBuffers.set(month, autoBuffer);
    nextMonthAutoBuffer = autoBuffer;
  }

  await batchMessages(async () => {
    for (const month of managedMonths) {
      await setBuffer(month, autoBuffers.get(month) ?? 0);
    }
  });

  await sheet.waitOnSpreadsheet();
}

let isRecalculatingFutureBuffer = false;

export async function recalculateFutureBuffer(): Promise<void> {
  if (isRecalculatingFutureBuffer) {
    return;
  }

  try {
    isRecalculatingFutureBuffer = true;
    await recalculateFutureBufferImpl();
  } finally {
    isRecalculatingFutureBuffer = false;
  }
}

registerBudgetChangeHook(async months => {
  if (!isFutureBufferModeActive()) {
    return;
  }

  for (const month of months) {
    if (isCurrentOrFutureMonth(month)) {
      await recalculateFutureBuffer();
      return;
    }
  }
});

export async function setFutureBufferMode({
  mode,
}: {
  mode: FutureBufferMode;
}): Promise<void> {
  await db.update('preferences', {
    id: 'futureBufferMode',
    value: mode,
  });

  if (mode === 'automatic') {
    await recalculateFutureBuffer();
  }
}

// Actions

export async function copyPreviousMonth({
  month,
}: {
  month: string;
}): Promise<void> {
  const prevMonth = monthUtils.toDbMonth(monthUtils.prevMonth(month));
  const table = getBudgetTable();
  const budgetData = await getBudgetData(table, prevMonth.toString());

  await batchMessages(async () => {
    for (const prevBudget of budgetData) {
      if (prevBudget.is_income === 1 && !isTrackingBudget()) {
        continue;
      }
      if (prevBudget.hidden === 1 || prevBudget.group_hidden === 1) {
        continue;
      }
      await setBudget({
        category: prevBudget.category,
        month,
        amount: prevBudget.amount,
      });
    }
  });
}

export async function copySinglePreviousMonth({
  month,
  category,
}: {
  month: string;
  category: string;
}): Promise<void> {
  const prevMonth = monthUtils.prevMonth(month);
  const newAmount = await getSheetValue(
    monthUtils.sheetForMonth(prevMonth),
    'budget-' + category,
  );
  await batchMessages(async () => {
    await setBudget({ category, month, amount: newAmount });
  });
}

export async function setZero({ month }: { month: string }): Promise<void> {
  const categories = await db.all<db.DbViewCategory>(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );

  await batchMessages(async () => {
    for (const cat of categories) {
      if (cat.is_income === 1 && !isTrackingBudget()) {
        continue;
      }
      await setBudget({ category: cat.id, month, amount: 0 });
    }
  });
}

export async function set3MonthAvg({
  month,
}: {
  month: string;
}): Promise<void> {
  const categories = await db.all<db.DbViewCategoryWithGroupHidden>(
    `
  SELECT c.*
  FROM categories c
  LEFT JOIN category_groups g ON c.cat_group = g.id
  WHERE c.tombstone = 0 AND c.hidden = 0 AND g.hidden = 0
  `,
  );

  await batchMessages(async () => {
    for (const cat of categories) {
      if (cat.is_income === 1 && !isTrackingBudget()) {
        continue;
      }

      let avg = await getCategoryAverage({
        month,
        maxMonths: 3,
        categoryId: cat.id,
      });

      if (cat.is_income === 0) {
        avg *= -1;
      }

      await setBudget({ category: cat.id, month, amount: avg });
    }
  });
}

export async function set12MonthAvg({
  month,
}: {
  month: string;
}): Promise<void> {
  const categories = await db.all<db.DbViewCategoryWithGroupHidden>(
    `
  SELECT c.*
  FROM categories c
  LEFT JOIN category_groups g ON c.cat_group = g.id
  WHERE c.tombstone = 0 AND c.hidden = 0 AND g.hidden = 0
  `,
  );

  await batchMessages(async () => {
    for (const cat of categories) {
      if (cat.is_income === 1 && !isTrackingBudget()) {
        continue;
      }
      await setNMonthAvg({ month, N: 12, category: cat.id });
    }
  });
}

export async function set6MonthAvg({
  month,
}: {
  month: string;
}): Promise<void> {
  const categories = await db.all<db.DbViewCategoryWithGroupHidden>(
    `
  SELECT c.*
  FROM categories c
  LEFT JOIN category_groups g ON c.cat_group = g.id
  WHERE c.tombstone = 0 AND c.hidden = 0 AND g.hidden = 0
  `,
  );

  await batchMessages(async () => {
    for (const cat of categories) {
      if (cat.is_income === 1 && !isTrackingBudget()) {
        continue;
      }
      await setNMonthAvg({ month, N: 6, category: cat.id });
    }
  });
}

export async function setNMonthAvg({
  month,
  N,
  category,
}: {
  month: string;
  N: number;
  category: string;
}): Promise<void> {
  const categoryFromDb = await db.first<Pick<db.DbViewCategory, 'is_income'>>(
    'SELECT is_income FROM v_categories WHERE id = ?',
    [category],
  );

  let avg = await getCategoryAverage({
    month,
    maxMonths: N,
    categoryId: category,
  });

  await batchMessages(async () => {
    if (categoryFromDb.is_income === 0) {
      avg *= -1;
    }

    await setBudget({ category, month, amount: avg });
  });
}

export async function getCategoryAverage({
  month,
  maxMonths,
  categoryId,
}: {
  month: string;
  maxMonths: number;
  categoryId: string;
}): Promise<number> {
  const months = await getAverageMonths({
    month,
    maxMonths,
    categoryId,
  });
  if (months.length === 0) {
    return 0;
  }

  let sumAmount = 0;
  for (const prevMonth of months) {
    sumAmount += await getSheetValue(
      monthUtils.sheetForMonth(prevMonth),
      'sum-amount-' + categoryId,
    );
  }
  return Math.round(sumAmount / months.length);
}

async function getAverageMonths({
  month,
  maxMonths,
  categoryId,
}: {
  month: string;
  maxMonths: number;
  categoryId: string;
}): Promise<string[]> {
  const firstMonth = getAverageStartMonth(month);
  const firstActivityMonth = await getFirstActivityMonth({
    categoryId,
    endMonth: firstMonth,
  });
  const months: string[] = [];
  let prevMonth = firstMonth;

  for (let l = 0; l < maxMonths; l++) {
    if (firstActivityMonth != null && prevMonth < firstActivityMonth) {
      break;
    }

    months.push(prevMonth);
    prevMonth = monthUtils.prevMonth(prevMonth);
  }

  return months;
}

function getAverageStartMonth(month: string): string {
  const prevMonth = monthUtils.prevMonth(month);

  if (prevMonth >= monthUtils.currentMonth()) {
    return monthUtils.prevMonth(monthUtils.currentMonth());
  }

  return prevMonth;
}

async function getFirstActivityMonth({
  categoryId,
  endMonth,
}: {
  categoryId: string;
  endMonth: string;
}): Promise<string | null> {
  const table = getBudgetTable();
  const endDbMonth = monthUtils.toDbMonth(endMonth);
  const firstActivity = await db.first<{ month: number | null }>(
    `SELECT MIN(month) AS month
       FROM (
         SELECT month
           FROM ${table}
          WHERE category = ? AND month <= ?
         UNION ALL
         SELECT CAST(t.date / 100 AS INTEGER) AS month
           FROM v_transactions_internal_alive t
           LEFT JOIN accounts a ON a.id = t.account
          WHERE t.category = ?
            AND CAST(t.date / 100 AS INTEGER) <= ?
            AND a.offbudget = 0
       )`,
    [categoryId, endDbMonth, categoryId, endDbMonth],
  );

  return firstActivity?.month == null
    ? null
    : monthUtils.fromDbMonth(firstActivity.month);
}

export async function holdForNextMonth({
  month,
  amount,
}: {
  month: string;
  amount: number;
}): Promise<boolean> {
  if (isFutureBufferModeActive() && isCurrentOrFutureMonth(month)) {
    return false;
  }

  const row = await db.first<Pick<db.DbZeroBudgetMonth, 'buffered'>>(
    'SELECT buffered FROM zero_budget_months WHERE id = ?',
    [month],
  );

  const sheetName = monthUtils.sheetForMonth(month);
  const toBudget = await getSheetValue(sheetName, 'to-budget');

  if (toBudget > 0) {
    const bufferedAmount = calcBufferedAmount(
      toBudget,
      (row && row.buffered) || 0,
      amount,
    );

    await setBuffer(month, bufferedAmount);
    return true;
  }
  return false;
}

export async function resetHold({ month }: { month: string }): Promise<void> {
  if (isFutureBufferModeActive() && isCurrentOrFutureMonth(month)) {
    return;
  }

  await setBuffer(month, 0);
}

export async function coverOverspending({
  month,
  to,
  from,
  amount,
  currencyCode,
}: {
  month: string;
  to: CategoryEntity['id'] | 'to-budget';
  from: CategoryEntity['id'] | 'to-budget' | 'overbudgeted';
  amount?: IntegerAmount;
  currencyCode: string;
}): Promise<void> {
  const sheetName = monthUtils.sheetForMonth(month);
  const toBudgeted = await getSheetValue(sheetName, 'budget-' + to);
  let leftoverFrom = await getSheetValue(
    sheetName,
    from === 'to-budget' ? 'to-budget' : 'leftover-' + from,
  );

  if (
    from === 'to-budget' &&
    isFutureBufferModeActive() &&
    isCurrentOrFutureMonth(month)
  ) {
    leftoverFrom += await getSheetValue(sheetName, 'buffered-selected');
  }

  // Cover provided amount (can be partial) or full overspending amount.
  const amountToCover = amount
    ? // Covering in the app provides a positive amount to cover so we invert it here
      -amount
    : await getSheetValue(sheetName, 'leftover-' + to);

  if (amountToCover >= 0 || leftoverFrom <= 0) {
    return;
  }

  // Don't go over the leftover amount of the covering category
  const coverableAmount = Math.min(Math.abs(amountToCover), leftoverFrom);

  await batchMessages(async () => {
    // If we are covering it from the to be budgeted amount, ignore this
    if (from !== 'to-budget') {
      const fromBudgeted = await getSheetValue(sheetName, 'budget-' + from);
      await setBudget({
        category: from,
        month,
        amount: fromBudgeted - coverableAmount,
      });
    }

    await setBudget({
      category: to,
      month,
      amount: toBudgeted + coverableAmount,
    });

    await addMovementNotes({
      month,
      amount: coverableAmount,
      to,
      from,
      currencyCode,
    });
  });
}

export async function transferAvailable({
  month,
  amount,
  category,
}: {
  month: string;
  amount: number;
  category: string;
}): Promise<void> {
  const sheetName = monthUtils.sheetForMonth(month);
  const leftover = await getSheetValue(sheetName, 'to-budget');
  amount = Math.max(Math.min(amount, leftover), 0);

  const budgeted = await getSheetValue(sheetName, 'budget-' + category);
  await setBudget({ category, month, amount: budgeted + amount });
}

export async function coverOverbudgeted({
  month,
  category,
  amount,
  currencyCode,
}: {
  month: string;
  category: string;
  amount?: IntegerAmount;
  currencyCode: string;
}): Promise<void> {
  const sheetName = monthUtils.sheetForMonth(month);
  const categoryBudget = await getSheetValue(sheetName, 'budget-' + category);
  const categoryLeftover = await getSheetValue(
    sheetName,
    'leftover-' + category,
  );

  // Cover provided amount (can be partial) or full overbudgeted amount.
  const amountToCover = amount
    ? // Covering in the app provides a positive amount to cover so we invert it here
      -amount
    : await getSheetValue(sheetName, 'to-budget');

  if (amountToCover >= 0 || categoryLeftover <= 0) {
    return;
  }

  // Don't exceed the available balance of the covering category.
  const coverableAmount = Math.min(Math.abs(amountToCover), categoryLeftover);

  await batchMessages(async () => {
    await setBudget({
      category,
      month,
      amount: categoryBudget - coverableAmount,
    });

    await addMovementNotes({
      month,
      amount: coverableAmount,
      from: category,
      to: 'overbudgeted',
      currencyCode,
    });
  });
}

export async function transferCategory({
  month,
  amount,
  from,
  to,
  currencyCode,
}: {
  month: string;
  amount: number;
  to: CategoryEntity['id'] | 'to-budget';
  from: CategoryEntity['id'] | 'to-budget';
  currencyCode: string;
}): Promise<void> {
  const sheetName = monthUtils.sheetForMonth(month);
  const fromBudgeted = await getSheetValue(sheetName, 'budget-' + from);

  await batchMessages(async () => {
    await setBudget({ category: from, month, amount: fromBudgeted - amount });

    // If we are simply moving it back into available cash to budget,
    // don't do anything else
    if (to !== 'to-budget') {
      const toBudgeted = await getSheetValue(sheetName, 'budget-' + to);
      await setBudget({ category: to, month, amount: toBudgeted + amount });
    }

    await addMovementNotes({
      month,
      amount,
      to,
      from,
      currencyCode,
    });
  });
}

export async function copyUntilYearEnd({
  month,
  category,
}: {
  month: string;
  category: string;
}): Promise<void> {
  const amount = await getSheetValue(
    monthUtils.sheetForMonth(month),
    'budget-' + category,
  );

  const yearEnd = monthUtils.getYearEnd(month);
  const { createdMonths } = sheet.get().meta();
  const futureMonths = [...(createdMonths as Set<string>)]
    .filter(m => m > month && m <= yearEnd)
    .sort();

  await batchMessages(async () => {
    for (const futureMonth of futureMonths) {
      await setBudget({ category, month: futureMonth, amount });
    }
  });
}

export async function setCategoryCarryover({
  startMonth,
  category,
  flag,
}: {
  startMonth: string;
  category: string;
  flag: boolean;
}): Promise<void> {
  const table = getBudgetTable();
  const categoryFromDb = await db.first<Pick<db.DbViewCategory, 'is_income'>>(
    'SELECT is_income FROM v_categories WHERE id = ?',
    [category],
  );
  const isIncomeCategory = categoryFromDb?.is_income === 1;
  const isFutureBufferActiveForIncome =
    isIncomeCategory && isFutureBufferModeActive();
  const allMonths = getAllMonths(startMonth);
  const months = isFutureBufferActiveForIncome
    ? allMonths.filter(month => month < monthUtils.currentMonth())
    : allMonths;
  const skippedMonths = isFutureBufferActiveForIncome
    ? allMonths.filter(isCurrentOrFutureMonth)
    : [];

  await batchMessages(async () => {
    for (const month of months) {
      await setCarryover(
        table,
        category,
        monthUtils.toDbMonth(month).toString(),
        flag,
      );
    }
  });

  if (skippedMonths.length > 0) {
    await runBudgetChangeHooks(skippedMonths);
  }
}

function addNewLine(notes?: string) {
  return !notes ? '' : `${notes}\n`;
}

async function addMovementNotes({
  month,
  amount,
  to,
  from,
  currencyCode,
}: {
  month: string;
  amount: number;
  to: CategoryEntity['id'] | 'to-budget' | 'overbudgeted';
  from: CategoryEntity['id'] | 'to-budget';
  currencyCode: string;
}) {
  const currency = getCurrency(currencyCode);
  const displayAmount = integerToCurrency(
    amount,
    undefined,
    currency.decimalPlaces,
  );

  const monthBudgetNotesId = `budget-${month}`;
  const existingMonthBudgetNotes = addNewLine(
    db.firstSync<Pick<db.DbNote, 'note'>>(
      `SELECT n.note FROM notes n WHERE n.id = ?`,
      [monthBudgetNotesId],
    )?.note,
  );

  const locale = getLocale(await asyncStorage.getItem('language'));
  const displayDay = monthUtils.format(
    monthUtils.currentDate(),
    'MMMM dd',
    locale,
  );
  const categories = await db.getCategories(
    [from, to].filter(c => c !== 'to-budget' && c !== 'overbudgeted'),
  );

  const fromCategoryName =
    from === 'to-budget'
      ? 'To Budget'
      : categories.find(c => c.id === from)?.name;

  const toCategoryName =
    to === 'to-budget'
      ? 'To Budget'
      : to === 'overbudgeted'
        ? 'Overbudgeted'
        : categories.find(c => c.id === to)?.name;

  const note = `Reassigned ${displayAmount} from ${fromCategoryName} → ${toCategoryName} on ${displayDay}`;

  await db.update('notes', {
    id: monthBudgetNotesId,
    note: `${existingMonthBudgetNotes}- ${note}`,
  });
}

export async function resetIncomeCarryover({
  month,
}: {
  month: string;
}): Promise<void> {
  const table = getBudgetTable();
  const categories = await db.all<db.DbViewCategory>(
    'SELECT * FROM v_categories WHERE is_income = 1 AND tombstone = 0',
  );

  await batchMessages(async () => {
    for (const category of categories) {
      await setCarryover(
        table,
        category.id,
        monthUtils.toDbMonth(month).toString(),
        false,
      );
    }
  });
}
