import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { resolveName } from '#server/spreadsheet/util';
import {
  convertAtMonthRate,
  convertBudgetAmount,
  getSqlDefaultCurrencyCode,
  getSqlOwnLineStarts,
  isSqlConversionEnabled,
} from '#shared/fx/sql';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import { getChangedValues } from '#shared/util';
import type { CategoryGroupEntity } from '#types/models';

import * as budgetActions from './actions';
import { BUDGET_CATEGORY_JOIN } from './budget-category-join';
import {
  getAllCurrencyLines,
  getCategoriesWithCurrencyLines,
  getCurrencyLine,
  getCurrencyLines,
  getLineFilterSql,
  getSpendingSql,
  loadCurrencyLines,
} from './category-currencies';
import type { CurrencyLine } from './category-currencies';
import * as envelopeBudget from './envelope';
import * as trackingBudget from './tracking';
import { number, sumAmounts } from './util';

// How far ahead budget months are available. Planning past the minimum
// keeps a few empty months after the latest allocation, up to a hard cap
// so stray far-future data can't create an unbounded number of months.
const MIN_MONTHS_AHEAD = 12;
const MONTHS_AFTER_LATEST_ALLOCATION = 3;
const MAX_MONTHS_AHEAD = 60;

export function getBudgetType() {
  const meta = sheet.get().meta();
  return meta.budgetType || 'envelope';
}

export function getBudgetRange(
  start: string,
  end: string,
  latestAllocatedMonth?: string | null,
) {
  start = monthUtils.getMonth(start);
  end = monthUtils.getMonth(end);

  // The start date should never be after the end date. If that
  // happened, the month range might be a valid range and weird
  // things happen
  if (start > end) {
    start = end;
  }

  const maxEnd = monthUtils.addMonths(end, MAX_MONTHS_AHEAD);

  // Budgets should exist 3 months before the earliest needed date
  // (either the oldest transaction or the current month if no
  // transactions yet), and at least a year from the current date.
  start = monthUtils.subMonths(start, 3);
  end = monthUtils.addMonths(end, MIN_MONTHS_AHEAD);

  if (latestAllocatedMonth) {
    const plannedEnd = monthUtils.addMonths(
      latestAllocatedMonth,
      MONTHS_AFTER_LATEST_ALLOCATION,
    );
    if (plannedEnd > end) {
      end = plannedEnd < maxEnd ? plannedEnd : maxEnd;
    }
  }

  return { start, end, range: monthUtils.rangeInclusive(start, end) };
}

// The latest month with a non-zero amount in the active budget type.
// Envelope and tracking amounts are stored separately, so each type
// extends its own range.
async function getLatestAllocatedMonth(): Promise<string | null> {
  const table =
    getBudgetType() === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
  const row = await db.first<{ month: number | null }>(
    `SELECT MAX(b.month) AS month FROM ${table} b
     ${BUDGET_CATEGORY_JOIN}
     WHERE c.tombstone = 0 AND b.amount != 0`,
  );
  if (!row?.month) {
    return null;
  }
  const month = String(row.month);
  return `${month.slice(0, 4)}-${month.slice(4)}`;
}

// The day range spanning the given months. They aren't guaranteed to be
// sorted, so find the first and last explicitly ('YYYY-MM' strings compare
// chronologically).
function getMonthSpanBounds(months: string[]) {
  let firstMonth = months[0];
  let lastMonth = months[0];
  for (const month of months) {
    if (month < firstMonth) {
      firstMonth = month;
    }
    if (month > lastMonth) {
      lastMonth = month;
    }
  }

  return {
    rangeStart: monthUtils.bounds(firstMonth).start,
    rangeEnd: monthUtils.bounds(lastMonth).end,
  };
}

// Recomputes the category sums that include transactions of accounts with
// a currency of their own. Only the transactions the sums count are looked
// at: alive and in on-budget accounts.
function recomputeConvertedSums(months: Set<string>) {
  const rows = db.runQuery<{ category: string; month: number }>(
    `SELECT DISTINCT t.category AS category, t.date / 100 AS month
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account
      WHERE a.currency IS NOT NULL
        AND a.offbudget = 0
        AND t.category IS NOT NULL`,
    [],
    true,
  );

  const sheetNames = new Set(
    [...months].map(month => monthUtils.sheetForMonth(month)),
  );
  for (const row of rows) {
    const sheetName = monthUtils.sheetForMonth(String(row.month));
    if (sheetNames.has(sheetName)) {
      sheet
        .get()
        .recompute(resolveName(sheetName, 'sum-amount-' + row.category));
    }
  }
}

// The cells of a category's currency lines that hold its amounts in the
// default currency, and the totals that add them to the category's own
const LINE_VALUES = [
  { total: 'budget-total-', own: 'budget-', value: 'budget-fx-' },
  { total: 'sum-amount-total-', own: 'sum-amount-', value: 'sum-amount-fx-' },
  { total: 'leftover-total-', own: 'leftover-', value: 'leftover-fx-' },
] as const;

// Recomputes what the amounts of every currency line are worth in the
// default currency, e.g. after a rate changed
function recomputeCurrencyLineValues(months: Iterable<string>) {
  const lines = getAllCurrencyLines();
  for (const month of months) {
    const sheetName = monthUtils.sheetForMonth(month);
    for (const line of lines) {
      for (const { value } of LINE_VALUES) {
        sheet.get().recompute(resolveName(sheetName, value + line.id));
      }
    }
  }
}

const CONVERSION_PREFERENCES = new Set([
  'flags.currency',
  'flags.multiCurrency',
  'defaultCurrencyCode',
  'currency-own-lines',
]);

type RateRow = Pick<
  db.DbExchangeRate,
  | 'id'
  | 'from_currency'
  | 'to_currency'
  | 'rate'
  | 'date'
  | 'source'
  | 'created_at'
  | 'tombstone'
>;

function isSameRate(a: RateRow | undefined, b: RateRow) {
  return (
    a != null &&
    a.from_currency === b.from_currency &&
    a.to_currency === b.to_currency &&
    a.rate === b.rate &&
    a.date === b.date &&
    a.source === b.source &&
    a.created_at === b.created_at &&
    a.tombstone === b.tombstone
  );
}

// Exchange rates and the currency settings change the converted category
// sums. Only actual changes count: synced messages that were already
// applied come with rows that didn't change.
function handleConversionChanges(months: Set<string>, oldValues, newValues) {
  const oldPreferences = oldValues.get('preferences');
  const isPreferenceChanged = [
    ...(newValues.get('preferences')?.values() ?? []),
  ].some(
    pref =>
      CONVERSION_PREFERENCES.has(pref.id) &&
      oldPreferences?.get(pref.id)?.value !== pref.value,
  );

  // While multiple currencies are off rates don't count
  const oldRates = oldValues.get('exchange_rates');
  const isRateChanged =
    isSqlConversionEnabled() &&
    [...(newValues.get('exchange_rates')?.values() ?? [])].some(
      (rate: RateRow) => !isSameRate(oldRates?.get(rate.id), rate),
    );

  if (isPreferenceChanged || isRateChanged) {
    recomputeConvertedSums(months);
    recomputeCurrencyLineValues(months);
  }
  // Which spending counts in a currency line depends on the default currency
  // and on multiple currencies being on
  if (isPreferenceChanged) {
    recomputeSpending(months, getCategoriesWithCurrencyLines());
  }
}

// Computes the spend total for every category in every month within the
// given day range using a single grouped query. This is used to seed the
// `sum-amount` cells on a cold build so we avoid running one
// `SELECT SUM(amount)` query per category per month (which scales as
// categories × months and dominates load time for budgets with many years
// of data). The filters must match the per-cell query in `getLineSpending`
// exactly so balances stay identical. Currency lines are keyed by their id,
// like categories.
export function getSumAmountsByMonth(
  rangeStart: number,
  rangeEnd: number,
): Map<string, number> {
  const { join, line, amount } = getSpendingSql();
  const rows = db.runQuery<{ month: number; category: string; amount: number }>(
    `SELECT ${line} AS category,
            t.date / 100 AS month,
            SUM(${amount}) AS amount
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account
       ${join}
      WHERE t.date >= ${rangeStart} AND t.date <= ${rangeEnd}
        AND t.category IS NOT NULL
        AND a.offbudget = 0
      GROUP BY ${line}, t.date / 100`,
    [],
    true,
  );

  const sums = new Map<string, number>();
  for (const row of rows) {
    sums.set(`${row.month}-${row.category}`, row.amount || 0);
  }
  return sums;
}

// Reseeds the `sum-amount` cells for the given months from the same single
// grouped query a cold build uses, and returns the names of the cells that
// were seeded. Resetting the budget cache recomputes every cell, which would
// otherwise run one `SELECT SUM(amount)` per category per month; the caller
// skips recomputing these and caches them directly instead.
export async function reseedSumAmounts(months: string[]): Promise<string[]> {
  if (months.length === 0) {
    return [];
  }

  const { rangeStart, rangeEnd } = getMonthSpanBounds(months);
  const sums = getSumAmountsByMonth(rangeStart, rangeEnd);

  const { data: groups }: { data: CategoryGroupEntity[] } = await aqlQuery(
    q('category_groups').select('*'),
  );
  const lineIds = groups
    .flatMap(group => group.categories)
    .flatMap(cat => [cat.id, ...getCurrencyLines(cat.id).map(line => line.id)]);

  const seededCells: string[] = [];
  for (const month of months) {
    const sheetName = monthUtils.sheetForMonth(month);
    const dbMonth = parseInt(month.replace('-', ''));

    for (const id of lineIds) {
      const name = resolveName(sheetName, `sum-amount-${id}`);
      // A cell the spreadsheet doesn't have stays out of the seed set and is
      // left to be recomputed normally.
      if (!sheet.get().hasCell(name)) {
        continue;
      }

      sheet.get().load(name, sums.get(`${dbMonth}-${id}`) || 0);
      seededCells.push(name);
    }
  }

  return seededCells;
}

// The spending of a category, or of one of its currency lines, between two
// days (YYYYMMDD)
export function getLineSpending(
  lineId: string,
  start: number,
  end: number,
): number {
  const { join, amount } = getSpendingSql();
  // Making this sync is faster!
  const rows = db.runQuery<{ amount: number }>(
    `SELECT SUM(${amount}) as amount
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account
       ${join}
     WHERE t.date >= ${start} AND t.date <= ${end}
       AND ${getLineFilterSql(lineId)} AND a.offbudget = 0`,
    [],
    true,
  );
  const row = rows[0];
  const amountValue = row ? row.amount : 0;
  return amountValue || 0;
}

export function createCategory(cat, sheetName, prevSheetName, start, end) {
  sheet.get().createDynamic(sheetName, 'sum-amount-' + cat.id, {
    initialValue: 0,
    run: () => getLineSpending(cat.id, start, end),
  });

  if (getBudgetType() === 'envelope') {
    envelopeBudget.createCategory(cat, sheetName, prevSheetName);
  } else {
    void trackingBudget.createCategory(cat, sheetName, prevSheetName);
  }
}

// The cells of a currency line in a month: its own amounts, in its
// currency, like those of a category, and what they are worth in the
// default currency at the month's rate
function createCurrencyLine(line: CurrencyLine, month: string) {
  const sheetName = monthUtils.sheetForMonth(month);
  const prevSheetName = monthUtils.sheetForMonth(monthUtils.prevMonth(month));
  const { start, end } = monthUtils.bounds(month);

  createCategory(
    { id: line.id, is_income: line.isIncome ? 1 : 0 },
    sheetName,
    prevSheetName,
    start,
    end,
  );

  for (const { own, value } of LINE_VALUES) {
    sheet.get().createDynamic(sheetName, value + line.id, {
      initialValue: 0,
      dependencies: [own + line.id],
      run: amount => convertBudgetAmount(number(amount), line.currency, month),
    });
  }
}

// The totals of a category with currency lines, in the default currency
function createCategoryTotals(
  categoryId: string,
  lines: CurrencyLine[],
  sheetName: string,
) {
  for (const { total, own, value } of LINE_VALUES) {
    const name = total + categoryId;
    const dependencies = [
      own + categoryId,
      ...lines.map(line => value + line.id),
    ];
    if (sheet.get().getNode(resolveName(sheetName, name)).dynamic) {
      sheet.get().addDependencies(sheetName, name, dependencies);
    } else {
      sheet.get().createDynamic(sheetName, name, {
        initialValue: 0,
        dependencies,
        run: sumAmounts,
      });
    }
  }
}

// The cells of all currency lines of a category in a month, e.g. when the
// category comes back after being deleted
export function createCurrencyLinesOf(categoryId: string, month: string) {
  const lines = getCurrencyLines(categoryId);
  for (const line of lines) {
    createCurrencyLine(line, month);
  }
  if (lines.length > 0) {
    createCategoryTotals(categoryId, lines, monthUtils.sheetForMonth(month));
  }
}

function handleAccountChange(months, oldValue, newValue) {
  if (
    !oldValue ||
    oldValue.offbudget !== newValue.offbudget ||
    // While multiple currencies are off amounts count as they are
    (oldValue.currency !== newValue.currency && isSqlConversionEnabled())
  ) {
    const rows = db.runQuery<Pick<db.DbTransaction, 'category'>>(
      `
        SELECT DISTINCT(category) as category FROM transactions
        WHERE acct = ?
      `,
      [newValue.id],
      true,
    );

    recomputeSpending(
      months,
      rows.map(row => row.category),
    );
  }
}

// Recomputes the spending of categories and of their currency lines
function recomputeSpending(
  months: Iterable<string>,
  categoryIds: Iterable<string>,
) {
  for (const month of months) {
    const sheetName = monthUtils.sheetForMonth(month);
    for (const categoryId of categoryIds) {
      sheet.get().recompute(resolveName(sheetName, 'sum-amount-' + categoryId));
      for (const line of getCurrencyLines(categoryId)) {
        sheet.get().recompute(resolveName(sheetName, 'sum-amount-' + line.id));
      }
    }
  }
}

function handleTransactionChange(transaction, changedFields) {
  if (
    (changedFields.has('date') ||
      changedFields.has('acct') ||
      changedFields.has('amount') ||
      changedFields.has('category') ||
      changedFields.has('tombstone') ||
      changedFields.has('isParent')) &&
    transaction.date &&
    transaction.category
  ) {
    const month = monthUtils.monthFromDate(db.fromDateRepr(transaction.date));
    recomputeSpending([month], [transaction.category]);
  }
}

function handleCategoryMappingChange(months, oldValue, newValue) {
  recomputeSpending(
    months,
    oldValue
      ? [oldValue.transferId, newValue.transferId]
      : [newValue.transferId],
  );
}

function isActiveCurrencyLine(row): boolean {
  return (
    row != null &&
    row.tombstone === 0 &&
    row.category != null &&
    row.currency != null &&
    row.start_month != null
  );
}

// A currency line added to or removed from a category, or moved to another
// first month
function handleCategoryCurrencyChange(months: Set<string>, oldValue, newValue) {
  const wasActive = isActiveCurrencyLine(oldValue);
  const isActive = isActiveCurrencyLine(newValue);
  const categoryId = newValue.category ?? oldValue?.category;
  const category =
    categoryId &&
    db.firstSync<
      Pick<db.DbCategory, 'cat_group' | 'hidden' | 'is_income' | 'tombstone'>
    >(
      'SELECT cat_group, hidden, is_income, tombstone FROM categories WHERE id = ?',
      [categoryId],
    );
  // Lines of a deleted category get their cells if it comes back, but lose
  // them when they're removed along with it
  if (!category || (category.tombstone === 1 && isActive)) {
    return;
  }

  const line: CurrencyLine = {
    id: newValue.id,
    category: categoryId,
    currency: newValue.currency ?? oldValue?.currency,
    startMonth: newValue.start_month ?? oldValue?.start_month,
    isIncome: category.is_income === 1,
    automatic: false,
  };
  const budgetType = getBudgetType();

  if (isActive && !wasActive) {
    if (budgetType === 'envelope') {
      envelopeBudget.createBlankCurrencyLine(line, [...months]);
    }
    for (const month of months) {
      const sheetName = monthUtils.sheetForMonth(month);
      createCurrencyLine(line, month);
      createCategoryTotals(categoryId, getCurrencyLines(categoryId), sheetName);
      if (budgetType === 'envelope') {
        envelopeBudget.addCurrencyLineDependencies(
          month,
          category.cat_group,
          line,
        );
      } else if (!category.hidden) {
        trackingBudget.addCurrencyLineDependencies(
          month,
          category.cat_group,
          line,
        );
      }
    }
  } else if (wasActive && !isActive) {
    for (const month of months) {
      const sheetName = monthUtils.sheetForMonth(month);
      for (const { total, value } of LINE_VALUES) {
        sheet
          .get()
          .removeDependencies(sheetName, total + categoryId, [value + line.id]);
      }
      if (budgetType === 'envelope') {
        envelopeBudget.removeCurrencyLineDependencies(
          month,
          category.cat_group,
          line,
        );
      } else {
        trackingBudget.removeCurrencyLineDependencies(
          month,
          category.cat_group,
          line,
        );
      }
    }
  }

  if (
    wasActive !== isActive ||
    oldValue?.start_month !== newValue.start_month
  ) {
    recomputeSpending(months, [categoryId]);
    // A removed line is no longer in the list, but keeps its cells
    for (const month of months) {
      sheet
        .get()
        .recompute(
          resolveName(monthUtils.sheetForMonth(month), 'sum-amount-' + line.id),
        );
    }
  }
}

// A currency line as a stored row would look, active or removed
function lineRow(line: CurrencyLine, tombstone = 0) {
  return {
    id: line.id,
    category: line.category,
    currency: line.currency,
    start_month: line.startMonth,
    tombstone,
  };
}

// The stored row of a line as the budget sees it: an automatic line counts
// as present without a stored row
function effectiveLineRow(row, line: CurrencyLine | undefined) {
  return isActiveCurrencyLine(row) || !line ? row : lineRow(line);
}

// Tables whose changes can add or remove automatic lines, as these follow
// the spending of each category in each currency
const AUTOMATIC_LINE_TABLES = ['transactions', 'accounts', 'category_mapping'];

function shouldReloadCurrencyLines(newValues: Map<string, unknown>): boolean {
  return (
    newValues.has('category_currencies') ||
    newValues.has('categories') ||
    newValues.has('preferences') ||
    (getSqlOwnLineStarts() != null &&
      AUTOMATIC_LINE_TABLES.some(table => newValues.has(table)))
  );
}

// Gives cells to the lines that appeared since `previous` and takes them
// out of the totals for those that went away, or moved to another first
// month: automatic lines come and go with spending and with the currencies
// budgeted on their own.
// Lines whose stored row changed in this batch are handled with it.
function handleCurrencyLineSetChange(
  months: Set<string>,
  previous: Map<string, CurrencyLine>,
  changedRows: Map<string, unknown> | undefined,
) {
  const ids = new Set([
    ...previous.keys(),
    ...getAllCurrencyLines().map(line => line.id),
  ]);
  for (const id of ids) {
    if (changedRows?.has(id)) {
      continue;
    }
    const before = previous.get(id);
    const after = getCurrencyLine(id);
    if (before && !after) {
      handleCategoryCurrencyChange(months, lineRow(before), lineRow(before, 1));
    } else if (!before && after) {
      handleCategoryCurrencyChange(months, undefined, lineRow(after));
    } else if (before && after && before.startMonth !== after.startMonth) {
      handleCategoryCurrencyChange(months, lineRow(before), lineRow(after));
    }
  }
}

function handleBudgetMonthChange(budget) {
  const sheetName = monthUtils.sheetForMonth(budget.id);
  sheet.get().set(`${sheetName}!buffered`, budget.buffered);
}

function handleBudgetChange(budget) {
  if (budget.category) {
    const sheetName = monthUtils.sheetForMonth(budget.month.toString());
    sheet
      .get()
      .set(`${sheetName}!budget-${budget.category}`, budget.amount || 0);
    sheet
      .get()
      .set(
        `${sheetName}!carryover-${budget.category}`,
        budget.carryover === 1 ? true : false,
      );
    sheet.get().set(`${sheetName}!goal-${budget.category}`, budget.goal);
    sheet
      .get()
      .set(`${sheetName}!long-goal-${budget.category}`, budget.long_goal);
  }
}

export function triggerBudgetChanges(oldValues, newValues) {
  const { createdMonths = new Set() } = sheet.get().meta();
  const budgetType = getBudgetType();
  // Amounts and goals are saved per budget type, and only the active type's
  // belong in the sheet. Go by the stored pref, which decides the table the
  // budget actions save to.
  const budgetTable = budgetActions.getBudgetTable();
  sheet.startTransaction();

  try {
    const previousLines = new Map(
      getAllCurrencyLines().map(line => [line.id, { ...line }]),
    );
    if (shouldReloadCurrencyLines(newValues)) {
      loadCurrencyLines();
    }
    // Before anything recomputes the cells of lines, so new lines have them
    handleCurrencyLineSetChange(
      createdMonths,
      previousLines,
      newValues.get('category_currencies'),
    );
    handleConversionChanges(createdMonths, oldValues, newValues);

    newValues.forEach((items, table) => {
      const old = oldValues.get(table);

      items.forEach(newValue => {
        const oldValue = old && old.get(newValue.id);

        if (table === 'zero_budget_months') {
          handleBudgetMonthChange(newValue);
        } else if (table === 'zero_budgets' || table === 'reflect_budgets') {
          if (table === budgetTable) {
            handleBudgetChange(newValue);
          }
        } else if (table === 'transactions') {
          const changed = new Set(
            Object.keys(getChangedValues(oldValue || {}, newValue) || {}),
          );

          if (oldValue) {
            handleTransactionChange(oldValue, changed);
          }
          handleTransactionChange(newValue, changed);
        } else if (table === 'category_mapping') {
          handleCategoryMappingChange(createdMonths, oldValue, newValue);
        } else if (table === 'categories') {
          if (budgetType === 'envelope') {
            envelopeBudget.handleCategoryChange(
              createdMonths,
              oldValue,
              newValue,
            );
          } else {
            trackingBudget.handleCategoryChange(
              createdMonths,
              oldValue,
              newValue,
            );
          }
        } else if (table === 'category_groups') {
          if (budgetType === 'envelope') {
            envelopeBudget.handleCategoryGroupChange(
              createdMonths,
              oldValue,
              newValue,
            );
          } else {
            trackingBudget.handleCategoryGroupChange(
              createdMonths,
              oldValue,
              newValue,
            );
          }
        } else if (table === 'accounts') {
          handleAccountChange(createdMonths, oldValue, newValue);
        } else if (table === 'category_currencies') {
          handleCategoryCurrencyChange(
            createdMonths,
            effectiveLineRow(oldValue, previousLines.get(newValue.id)),
            effectiveLineRow(newValue, getCurrencyLine(newValue.id)),
          );
        }
      });
    });
  } finally {
    sheet.endTransaction();
  }
}

// Moves the budgets of categories, and of their currency lines at each
// month's rate, into `transferId`
export async function doTransfer(categoryIds, transferId) {
  const { createdMonths: months } = sheet.get().meta();
  const ids = categoryIds.flatMap(id => [
    id,
    ...getCurrencyLines(id).map(line => line.id),
  ]);

  [...months].forEach(month => {
    const totalValue = ids
      .map(id => {
        const amount = budgetActions.getBudget({ month, category: id });
        const line = getCurrencyLine(id);
        return line && amount
          ? convertAtMonthRate(
              amount,
              line.currency,
              getSqlDefaultCurrencyCode(),
              month,
            )
          : amount;
      })
      .reduce((total, value) => total + value, 0);

    const transferValue = budgetActions.getBudget({
      month,
      category: transferId,
    });

    void budgetActions.setBudget({
      month,
      category: transferId,
      amount: totalValue + transferValue,
    });
  });
}

export async function createBudget(months) {
  const { data: groups }: { data: CategoryGroupEntity[] } = await aqlQuery(
    q('category_groups').select('*'),
  );
  const categories = groups.flatMap(group => group.categories);
  loadCurrencyLines();

  sheet.startTransaction();
  const meta = sheet.get().meta();
  meta.createdMonths = meta.createdMonths || new Set();

  const budgetType = getBudgetType();

  if (budgetType === 'envelope') {
    envelopeBudget.createBudget(meta, categories, months);
  }

  // Only months that don't already exist need to be created and seeded.
  const monthsToCreate = months.filter(month => !meta.createdMonths.has(month));

  // Spend totals for every category in the months being created, computed
  // once via a single grouped query and used to seed the `sum-amount` cells so
  // they don't each run their own query. Scoped to the uncached month span so
  // extending the budget horizon doesn't rescan the entire transaction
  // history, and loaded lazily so warm loads never touch the database here.
  let sumAmounts: Map<string, number> | null = null;
  const getSumAmounts = () => {
    if (!sumAmounts) {
      const { rangeStart, rangeEnd } = getMonthSpanBounds(monthsToCreate);
      sumAmounts = getSumAmountsByMonth(rangeStart, rangeEnd);
    }
    return sumAmounts;
  };
  const seededCells: string[] = [];

  monthsToCreate.forEach(month => {
    const prevMonth = monthUtils.prevMonth(month);
    const { start, end } = monthUtils.bounds(month);
    const sheetName = monthUtils.sheetForMonth(month);
    const prevSheetName = monthUtils.sheetForMonth(prevMonth);
    const dbMonth = parseInt(month.replace('-', ''));

    // Seed the spend total before creating the dynamic cell so the cell
    // skips its per-category query. Only happens on a cold build, when
    // the value hasn't been restored from cache.
    const seedSpending = (id: string) => {
      const sumCell = `sum-amount-${id}`;
      if (sheet.get().getCellValueLoose(sheetName, sumCell) == null) {
        const name = resolveName(sheetName, sumCell);
        sheet.get().load(name, getSumAmounts().get(`${dbMonth}-${id}`) || 0);
        seededCells.push(name);
      }
    };

    categories.forEach(cat => {
      seedSpending(cat.id);
      createCategory(cat, sheetName, prevSheetName, start, end);

      const lines = getCurrencyLines(cat.id);
      for (const line of lines) {
        seedSpending(line.id);
        createCurrencyLine(line, month);
      }
      if (lines.length > 0) {
        createCategoryTotals(cat.id, lines, sheetName);
      }
    });
    groups.forEach(group => {
      if (budgetType === 'envelope') {
        envelopeBudget.createCategoryGroup(group, sheetName);
      } else {
        trackingBudget.createCategoryGroup(group, sheetName);
      }
    });

    if (budgetType === 'envelope') {
      envelopeBudget.createSummary(
        groups,
        categories,
        prevSheetName,
        sheetName,
      );
    } else {
      trackingBudget.createSummary(groups, sheetName);
    }

    meta.createdMonths.add(month);
  });

  sheet.get().setMeta(meta);
  sheet.endTransaction();

  // Persist the seeded spend totals to the cache. Because they were loaded
  // directly (rather than recomputed) they aren't part of the computation
  // queue that normally gets cached, so without this a warm load would have
  // to recompute them. The cells already hold their final values here.
  if (seededCells.length > 0) {
    sheet.get().saveCachedCells(seededCells);
  }

  // Wait for the spreadsheet to finish computing. Normally this won't
  // do anything (as values are cached) but on first run this need to
  // show the loading screen while it initially sets up.
  await sheet.waitOnSpreadsheet();
}

export async function createAllBudgets() {
  const earliestTransaction = await db.first<db.DbTransaction>(
    'SELECT * FROM transactions WHERE isChild=0 AND date IS NOT NULL ORDER BY date ASC LIMIT 1',
  );
  const earliestDate =
    earliestTransaction && db.fromDateRepr(earliestTransaction.date);
  const currentMonth = monthUtils.currentMonth();

  // Get the range based off of the earliest transaction and the
  // current month. If no transactions currently exist the current
  // month is also used as the starting month
  const { start, end, range } = getBudgetRange(
    earliestDate || currentMonth,
    currentMonth,
    await getLatestAllocatedMonth(),
  );

  const meta = sheet.get().meta();
  const createdMonths = meta.createdMonths || new Set();
  const newMonths = range.filter(m => !createdMonths.has(m));

  if (newMonths.length > 0) {
    await createBudget(range);
  }

  // The range only grows while the budget is open, so every created month
  // stays reachable. Clearing allocations shrinks it on the next load.
  let lastMonth = end;
  for (const month of sheet.get().meta().createdMonths) {
    if (month > lastMonth) {
      lastMonth = month;
    }
  }

  return { start, end: lastMonth };
}

export async function setType(type) {
  const meta = sheet.get().meta();
  if (type === meta.budgetType) {
    return;
  }

  meta.budgetType = type;
  meta.createdMonths = new Set();

  // Go through and force all the cells to be recomputed
  const nodes = sheet.get().getNodes();
  db.transaction(() => {
    for (const name of nodes.keys()) {
      const [sheetName, cellName] = name.split('!');
      if (sheetName.match(/^budget\d+/)) {
        sheet.get().deleteCell(sheetName, cellName);
      }
    }
  });

  sheet.get().startCacheBarrier();
  // The cache still holds the old type's cells. Goals and other inputs are
  // never recomputed, so the next load from the cache would restore them.
  sheet.clearCache();
  await sheet.loadUserBudgets(db);
  const bounds = await createAllBudgets();
  sheet.get().endCacheBarrier();

  return bounds;
}
