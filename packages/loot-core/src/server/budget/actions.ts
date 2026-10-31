// @ts-strict-ignore

import * as asyncStorage from '#platform/server/asyncStorage';
import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { batchMessages } from '#server/sync';
import { getRecordedAmountPrecision } from '#server/util/currency';
import { getLocale } from '#shared/locale';
import * as monthUtils from '#shared/months';
import { getNumberFormat, integerToCurrency, safeNumber } from '#shared/util';
import type { IntegerAmount } from '#shared/util';
import type { CategoryEntity } from '#types/models';

import {
  baseSlotCarryIn,
  baseSlotCell,
  baseSlotOf,
  categoryUncarriedOverspending,
  displayPrecision,
  foreignSlotOf,
  foreignSlots,
  setBaseTarget,
  setForeignTarget,
  setSlotCarryover,
  slotMonth,
  slotSpending,
  uncarriedOverspending,
} from './pocket-flows';
import type { BaseSlotField, Slot } from './pocket-flows';
import { laneInfo } from './pockets';

const CATEGORY_CELL = /^(budget|sum-amount|leftover|carryover)-(.+)$/;
const MONTH_SHEET = /^budget(\d{4})(\d{2})$/;

/**
 * A category-keyed envelope cell as its base slot shows it (MC-10.5).
 * After a base-child cutover, or while a category inherits other base
 * lanes, its own cells describe another history, so template and cleanup
 * inputs read the current base slot instead.
 */
async function slotCell(sheetName: string, cell: string) {
  const name = CATEGORY_CELL.exec(cell);
  const month = MONTH_SHEET.exec(sheetName);
  if (!name || !month || isTrackingBudget()) return undefined;
  return baseSlotCell(
    name[2],
    `${month[1]}-${month[2]}`,
    name[1] as BaseSlotField,
  );
}

/**
 * What a category's base slot carries into a month after each of its lanes'
 * own reset, when its envelope cells do not describe the slot (templates);
 * undefined otherwise, so the category's carry rule applies.
 */
export async function getBaseSlotCarryIn(
  category: string,
  month: string,
): Promise<number | undefined> {
  return isTrackingBudget() ? undefined : baseSlotCarryIn(category, month);
}

/**
 * The overspending a category's base slot resets at the end of a month,
 * which cleanup funds: per lane of the current base slot when the
 * category's envelope cells do not describe it.
 */
export function getUncarriedOverspending(
  category: string,
  month: string,
  balance: number,
): Promise<number> {
  // Tracking budgets keep the category rule, like the other readers.
  return isTrackingBudget()
    ? categoryUncarriedOverspending(category, month, balance)
    : uncarriedOverspending(category, month, balance);
}

export async function getSheetValue(
  sheetName: string,
  cell: string,
): Promise<number> {
  const slot = await slotCell(sheetName, cell);
  if (typeof slot === 'number') return safeNumber(slot);
  const node = sheet.getCell(sheetName, cell);
  return safeNumber(typeof node.value === 'number' ? node.value : 0);
}

export async function getSheetBoolean(
  sheetName: string,
  cell: string,
): Promise<boolean> {
  const slot = await slotCell(sheetName, cell);
  if (typeof slot === 'boolean') return slot;
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

function dbMonth(month: string): number {
  return parseInt(month.replace('-', ''));
}

function monthFromDbMonth(month: number): string {
  const monthString = String(month).padStart(6, '0');
  return `${monthString.slice(0, 4)}-${monthString.slice(4)}`;
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
  // Envelope budgets read a category's base slot as setBudget writes it:
  // its displayed amount, own plus inherited lanes (MC-10).
  if (table === 'zero_budgets' && laneInfo(category)) {
    const slot = baseSlotOf(category);
    return slot ? Number(slotMonth(slot, month).displayed ?? 0) : 0;
  }
  const existing = db.firstSync<db.DbZeroBudget | db.DbReflectBudget>(
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
  category: CategoryEntity['id'];
  month: string;
  amount: unknown;
}): Promise<void> {
  const value = safeNumber(typeof amount === 'number' ? amount : 0);
  amount = value;
  const table = getBudgetTable();
  // Envelope budgets write the category's base slot: its displayed amount,
  // own plus inherited lanes (MC-10.5).
  if (table === 'zero_budgets' && laneInfo(category)) {
    const slot = baseSlotOf(category);
    // A category whose base lanes were all retired has no slot to write
    // until Add Currency creates its next generation.
    return slot ? setBaseTarget(slot, month, value) : Promise.resolve();
  }

  const existing = db.firstSync<
    Pick<db.DbZeroBudget | db.DbReflectBudget, 'id'>
  >(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    dbMonth(month),
    category,
  ]);
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

/** A category's budgeted amount: its base slot's own and inherited lanes. */
function getBudgeted(month: string, category: string): Promise<number> {
  return getSheetValue(monthUtils.sheetForMonth(month), 'budget-' + category);
}

/** Server-computed targets for every live foreign slot (S9). */
async function setForeignTargets(
  month: string,
  include: (entry: { isIncome: boolean; hidden: boolean }) => boolean,
  target: (slot: Slot, precision: number) => Promise<bigint | null>,
) {
  if (isTrackingBudget()) return;
  for (const entry of foreignSlots()) {
    if (!include(entry)) continue;
    const precision = displayPrecision(entry.slot);
    const value = await target(entry.slot, precision);
    if (value !== null) {
      await setForeignTarget(entry.slot, month, value, precision);
    }
  }
}

/** The previous month's displayed slot amount, when it has any cell. */
function previousTarget(slot: Slot, month: string, precision: number) {
  const prev = slotMonth(slot, monthUtils.prevMonth(month));
  if (!prev.exists || prev.displayed === null) return null;
  return prev.displayed * 10n ** BigInt(precision - prev.scale);
}

/**
 * A foreign slot's average target: displayed spending over the category's
 * average window, at its display precision, rounded as base averages are.
 */
async function foreignAverage(
  slot: Slot,
  month: string,
  maxMonths: number,
  precision: number,
): Promise<bigint | null> {
  const months = await getAverageMonths({
    month,
    maxMonths,
    categoryId: slot.category,
  });
  if (months.length === 0) return 0n;
  let sum = 0n;
  for (const m of months) {
    const spent = slotSpending(slot, m, precision);
    if (spent === null) return null;
    sum += spent;
  }
  const n = BigInt(months.length);
  // Math.round: halves toward positive infinity.
  const numerator = 2n * sum + n;
  const denominator = 2n * n;
  const floor =
    numerator >= 0n
      ? numerator / denominator
      : -((-numerator + denominator - 1n) / denominator);
  return -floor;
}

export function setGoal({ month, category, goal, long_goal }): Promise<void> {
  const table = getBudgetTable();
  const existing = db.firstSync<
    Pick<db.DbZeroBudget | db.DbReflectBudget, 'id'>
  >(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    dbMonth(month),
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
    id: `${dbMonth(month)}-${category}`,
    month: dbMonth(month),
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

// Actions

export async function copyPreviousMonth({
  month,
}: {
  month: string;
}): Promise<void> {
  const prevMonth = dbMonth(monthUtils.prevMonth(month));
  const table = getBudgetTable();
  const budgetData = await getBudgetData(table, prevMonth.toString());

  await batchMessages(async () => {
    if (table === 'zero_budgets') {
      await copyPreviousBaseSlots(month);
    } else {
      budgetData.forEach(prevBudget => {
        if (prevBudget.hidden === 1 || prevBudget.group_hidden === 1) {
          return;
        }
        void setBudget({
          category: prevBudget.category,
          month,
          amount: prevBudget.amount,
        });
      });
    }
    await setForeignTargets(
      month,
      ({ isIncome, hidden }) => !isIncome && !hidden,
      async (slot, precision) => previousTarget(slot, month, precision),
    );
  });
}

/** Envelope copy: each visible expense base slot with a previous cell. */
async function copyPreviousBaseSlots(month: string) {
  const categories = await db.all<db.DbViewCategoryWithGroupHidden>(
    `SELECT c.* FROM categories c
       LEFT JOIN category_groups g ON c.cat_group = g.id
     WHERE c.tombstone = 0 AND c.is_income = 0 AND c.hidden = 0
       AND COALESCE(g.hidden, 0) = 0`,
  );
  for (const cat of categories) {
    const slot = baseSlotOf(cat.id);
    const target = slot && previousTarget(slot, month, 0);
    if (slot && target !== null) {
      await setBaseTarget(slot, month, Number(target));
    }
  }
}

export async function copySinglePreviousMonth({
  month,
  category,
}: {
  month: string;
  category: string;
}): Promise<void> {
  const foreign = isTrackingBudget() ? null : foreignSlotOf(category);
  if (foreign) {
    const precision = displayPrecision(foreign);
    const target = slotMonth(foreign, monthUtils.prevMonth(month));
    if (target.displayed === null) return;
    await batchMessages(async () => {
      await setForeignTarget(
        foreign,
        month,
        target.displayed! * 10n ** BigInt(precision - target.scale),
        precision,
      );
    });
    return;
  }
  const prevMonth = monthUtils.prevMonth(month);
  const newAmount = await getBudgeted(prevMonth, category);
  await batchMessages(async () => {
    void setBudget({ category, month, amount: newAmount });
  });
}

export async function setZero({ month }: { month: string }): Promise<void> {
  const categories = await db.all<db.DbViewCategory>(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );

  await batchMessages(async () => {
    categories.forEach(cat => {
      if (cat.is_income === 1 && !isTrackingBudget()) {
        return;
      }
      void setBudget({ category: cat.id, month, amount: 0 });
    });
    await setForeignTargets(
      month,
      ({ isIncome }) => !isIncome,
      async () => 0n,
    );
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

      void setBudget({ category: cat.id, month, amount: avg });
    }
    await setForeignTargets(
      month,
      ({ isIncome, hidden }) => !isIncome && !hidden,
      (slot, precision) => foreignAverage(slot, month, 3, precision),
    );
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
      void setNMonthAvg({ month, N: 12, category: cat.id });
    }
    await setForeignTargets(
      month,
      ({ isIncome, hidden }) => !isIncome && !hidden,
      (slot, precision) => foreignAverage(slot, month, 12, precision),
    );
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
      void setNMonthAvg({ month, N: 6, category: cat.id });
    }
    await setForeignTargets(
      month,
      ({ isIncome, hidden }) => !isIncome && !hidden,
      (slot, precision) => foreignAverage(slot, month, 6, precision),
    );
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
  const foreign = isTrackingBudget() ? null : foreignSlotOf(category);
  if (foreign) {
    const precision = displayPrecision(foreign);
    const target = await foreignAverage(foreign, month, N, precision);
    if (target === null) return;
    await batchMessages(async () => {
      await setForeignTarget(foreign, month, target, precision);
    });
    return;
  }
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

    void setBudget({ category, month, amount: avg });
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
  const endDbMonth = dbMonth(endMonth);
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
    : monthFromDbMonth(firstActivity.month);
}

export async function holdForNextMonth({
  month,
  amount,
}: {
  month: string;
  amount: number;
}): Promise<boolean> {
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
  await setBuffer(month, 0);
}

export async function coverOverspending({
  month,
  to,
  from,
  amount,
}: {
  month: string;
  to: CategoryEntity['id'] | 'to-budget';
  from: CategoryEntity['id'] | 'to-budget' | 'overbudgeted';
  amount?: IntegerAmount;
  currencyCode: string;
}): Promise<void> {
  const sheetName = monthUtils.sheetForMonth(month);
  const toBudgeted = await getBudgeted(month, to);
  const leftoverFrom = await getSheetValue(
    sheetName,
    from === 'to-budget' ? 'to-budget' : 'leftover-' + from,
  );

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
      const fromBudgeted = await getBudgeted(month, from);
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

  const budgeted = await getBudgeted(month, category);
  await setBudget({ category, month, amount: budgeted + amount });
}

export async function coverOverbudgeted({
  month,
  category,
  amount,
}: {
  month: string;
  category: string;
  amount?: IntegerAmount;
  currencyCode: string;
}): Promise<void> {
  const sheetName = monthUtils.sheetForMonth(month);
  const categoryBudget = await getBudgeted(month, category);
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
    });
  });
}

export async function transferCategory({
  month,
  amount,
  from,
  to,
}: {
  month: string;
  amount: number;
  to: CategoryEntity['id'] | 'to-budget';
  from: CategoryEntity['id'] | 'to-budget';
  currencyCode: string;
}): Promise<void> {
  const fromBudgeted = await getBudgeted(month, from);

  await batchMessages(async () => {
    await setBudget({ category: from, month, amount: fromBudgeted - amount });

    // If we are simply moving it back into available cash to budget,
    // don't do anything else
    if (to !== 'to-budget') {
      const toBudgeted = await getBudgeted(month, to);
      await setBudget({ category: to, month, amount: toBudgeted + amount });
    }

    await addMovementNotes({
      month,
      amount,
      to,
      from,
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
  const yearEnd = monthUtils.getYearEnd(month);
  const { createdMonths } = sheet.get().meta();
  const futureMonths = [...(createdMonths as Set<string>)]
    .filter(m => m > month && m <= yearEnd)
    .sort();

  const foreign = isTrackingBudget() ? null : foreignSlotOf(category);
  if (foreign) {
    const precision = displayPrecision(foreign);
    const current = slotMonth(foreign, month);
    if (current.displayed === null) return;
    const target = current.displayed * 10n ** BigInt(precision - current.scale);
    await batchMessages(async () => {
      for (const futureMonth of futureMonths) {
        await setForeignTarget(foreign, futureMonth, target, precision);
      }
    });
    return;
  }

  const amount = await getBudgeted(month, category);
  await batchMessages(async () => {
    for (const futureMonth of futureMonths) {
      void setBudget({ category, month: futureMonth, amount });
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
  const months = getAllMonths(startMonth);
  // Envelope carry edits write the slot's own and inherited lanes; a
  // currency pocket is named by its lane.
  const slot =
    table === 'zero_budgets'
      ? (foreignSlotOf(category) ?? baseSlotOf(category))
      : null;
  if (slot) {
    await batchMessages(() => setSlotCarryover(slot, months, flag));
    return;
  }

  await batchMessages(async () => {
    for (const month of months) {
      void setCarryover(table, category, dbMonth(month).toString(), flag);
    }
  });
}

function addNewLine(notes?: string) {
  return !notes ? '' : `${notes}\n`;
}

async function addMovementNotes({
  month,
  amount,
  to,
  from,
}: {
  month: string;
  amount: number;
  to: CategoryEntity['id'] | 'to-budget' | 'overbudgeted';
  from: CategoryEntity['id'] | 'to-budget';
}) {
  const precision = getRecordedAmountPrecision();
  const displayAmount = integerToCurrency(
    amount,
    getNumberFormat({ decimalPlaces: precision }).formatter,
    precision,
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
      await setCarryover(table, category.id, dbMonth(month).toString(), false);
    }
  });
}
