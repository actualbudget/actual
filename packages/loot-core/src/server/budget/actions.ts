import * as monthUtils from '../../shared/months';
import { safeNumber } from '../../shared/util';
import * as db from '../db';
import * as prefs from '../prefs';
import * as sheet from '../sheet';
import { batchMessages } from '../sync';

export async function getSheetValue(
  sheetName: string,
  cell: string,
): Promise<number> {
  const node = await sheet.getCell(sheetName, cell);
  return safeNumber(typeof node.value === 'number' ? node.value : 0);
}

// We want to only allow the positive movement of money back and
// forth. buffered should never be allowed to go into the negative,
// and you shouldn't be allowed to pull non-existant money from
// leftover.
function calcBufferedAmount(
  toBudget: number,
  buffered: number,
  amount: number,
): number {
  amount = Math.min(Math.max(amount, -buffered), Math.max(toBudget, 0));
  return buffered + amount;
}

function getBudgetTable(): string {
  let { budgetType } = prefs.getPrefs() || {};
  return budgetType === 'report' ? 'reflect_budgets' : 'zero_budgets';
}

export function isReflectBudget(): boolean {
  let { budgetType } = prefs.getPrefs();
  return budgetType === 'report';
}

function dbMonth(month: string): number {
  return parseInt(month.replace('-', ''));
}

// TODO: complete list of fields.
type BudgetData = {
  is_income: 1 | 0;
  category: string;
  amount: number;
};

function getBudgetData(table: string, month: string): Promise<BudgetData[]> {
  return db.all(
    `
    SELECT b.*, c.is_income FROM v_categories c
    LEFT JOIN ${table} b ON b.category = c.id
    WHERE c.tombstone = 0 AND b.month = ?
  `,
    [month],
  );
}

function getAllMonths(startMonth: string): string[] {
  let { createdMonths } = sheet.get().meta();
  let latest = null;
  for (let month of createdMonths) {
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
  let table = getBudgetTable();
  let existing = db.firstSync(
    `SELECT * FROM ${table} WHERE month = ? AND category = ?`,
    [dbMonth(month), category],
  );
  return existing ? existing.amount || 0 : 0;
}

export function setBudget({
  category,
  month,
  amount,
}: {
  category: string;
  month: string;
  amount: unknown;
}): Promise<void> {
  amount = safeNumber(typeof amount === 'number' ? amount : 0);
  const table = getBudgetTable();

  let existing = db.firstSync(
    `SELECT id FROM ${table} WHERE month = ? AND category = ?`,
    [dbMonth(month), category],
  );
  if (existing) {
    return db.update(table, { id: existing.id, amount });
  }
  return db.insert(table, {
    id: `${dbMonth(month)}-${category}`,
    month: dbMonth(month),
    category,
    amount,
  });
}

export function setBuffer(month: string, amount: unknown): Promise<void> {
  let existing = db.firstSync(
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
  let existing = db.firstSync(
    `SELECT id FROM ${table} WHERE month = ? AND category = ?`,
    [month, category],
  );
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

// Actions

export async function copyPreviousMonth({
  month,
}: {
  month: string;
}): Promise<void> {
  let prevMonth = dbMonth(monthUtils.prevMonth(month));
  let table = getBudgetTable();
  let budgetData = await getBudgetData(table, prevMonth.toString());

  await batchMessages(async () => {
    budgetData.forEach(prevBudget => {
      if (prevBudget.is_income === 1 && !isReflectBudget()) {
        return;
      }
      setBudget({
        category: prevBudget.category,
        month,
        amount: prevBudget.amount,
      });
    });
  });
}

export async function copySinglePreviousMonth({
  month,
  category,
}: {
  month: string;
  category: string;
}): Promise<void> {
  let prevMonth = monthUtils.prevMonth(month);
  let newAmount = await getSheetValue(
    monthUtils.sheetForMonth(prevMonth),
    'budget-' + category,
  );
  await batchMessages(async () => {
    setBudget({ category: category, month, amount: newAmount });
  });
}

export async function setZero({ month }: { month: string }): Promise<void> {
  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );

  await batchMessages(async () => {
    categories.forEach(cat => {
      if (cat.is_income === 1 && !isReflectBudget()) {
        return;
      }
      setBudget({ category: cat.id, month, amount: 0 });
    });
  });
}

export async function set3MonthAvg({
  month,
}: {
  month: string;
}): Promise<void> {
  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );

  let prevMonth1 = monthUtils.prevMonth(month);
  let prevMonth2 = monthUtils.prevMonth(prevMonth1);
  let prevMonth3 = monthUtils.prevMonth(prevMonth2);

  await batchMessages(async () => {
    for (let cat of categories) {
      if (cat.is_income === 1 && !isReflectBudget()) {
        continue;
      }

      let spent1 = await getSheetValue(
        monthUtils.sheetForMonth(prevMonth1),
        'sum-amount-' + cat.id,
      );
      let spent2 = await getSheetValue(
        monthUtils.sheetForMonth(prevMonth2),
        'sum-amount-' + cat.id,
      );
      let spent3 = await getSheetValue(
        monthUtils.sheetForMonth(prevMonth3),
        'sum-amount-' + cat.id,
      );

      const avg = Math.round((spent1 + spent2 + spent3) / 3);
      setBudget({ category: cat.id, month, amount: -avg });
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
  let prevMonth = monthUtils.prevMonth(month);
  let sumAmount = 0;
  for (let l = 0; l < N; l++) {
    sumAmount += await getSheetValue(
      monthUtils.sheetForMonth(prevMonth),
      'sum-amount-' + category,
    );
    prevMonth = monthUtils.prevMonth(prevMonth);
  }
  await batchMessages(async () => {
    const avg = Math.round(sumAmount / N);
    setBudget({ category: category, month, amount: -avg });
  });
}

export async function holdForNextMonth({
  month,
  amount,
}: {
  month: string;
  amount: number;
}): Promise<boolean> {
  let row = await db.first(
    'SELECT buffered FROM zero_budget_months WHERE id = ?',
    [month],
  );

  let sheetName = monthUtils.sheetForMonth(month);
  let toBudget = await getSheetValue(sheetName, 'to-budget');

  if (toBudget > 0) {
    let bufferedAmount = calcBufferedAmount(
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
  await setBuffer(month, 0);
}

export async function coverOverspending({
  month,
  to,
  from,
}: {
  month: string;
  to: string;
  from: string;
}): Promise<void> {
  let sheetName = monthUtils.sheetForMonth(month);
  let toBudgeted = await getSheetValue(sheetName, 'budget-' + to);
  let leftover = await getSheetValue(sheetName, 'leftover-' + to);
  let leftoverFrom = await getSheetValue(
    sheetName,
    from === 'to-be-budgeted' ? 'to-budget' : 'leftover-' + from,
  );

  if (leftover >= 0 || leftoverFrom <= 0) {
    return;
  }

  let amountCovered = Math.min(-leftover, leftoverFrom);

  // If we are covering it from the to be budgeted amount, ignore this
  if (from !== 'to-be-budgeted') {
    const fromBudgeted = await getSheetValue(sheetName, 'budget-' + from);
    await setBudget({
      category: from,
      month,
      amount: fromBudgeted - amountCovered,
    });
  }

  await setBudget({ category: to, month, amount: toBudgeted + amountCovered });
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
  let sheetName = monthUtils.sheetForMonth(month);
  let leftover = await getSheetValue(sheetName, 'to-budget');
  amount = Math.max(Math.min(amount, leftover), 0);

  let budgeted = await getSheetValue(sheetName, 'budget-' + category);
  await setBudget({ category, month, amount: budgeted + amount });
}

export async function transferCategory({
  month,
  amount,
  from,
  to,
}: {
  month: string;
  amount: number;
  to: string;
  from: string;
}): Promise<void> {
  const sheetName = monthUtils.sheetForMonth(month);
  const fromBudgeted = await getSheetValue(sheetName, 'budget-' + from);

  await setBudget({ category: from, month, amount: fromBudgeted - amount });

  // If we are simply moving it back into available cash to budget,
  // don't do anything else
  if (to !== 'to-be-budgeted') {
    const toBudgeted = await getSheetValue(sheetName, 'budget-' + to);
    await setBudget({ category: to, month, amount: toBudgeted + amount });
  }
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
  let table = getBudgetTable();
  let months = getAllMonths(startMonth);

  await batchMessages(async () => {
    for (let month of months) {
      setCarryover(table, category, dbMonth(month).toString(), flag);
    }
  });
}
