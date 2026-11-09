import { createApp } from '#server/app';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { APIError } from '#server/errors';
import { categoryGroupModel, categoryModel } from '#server/models';
import { mutator } from '#server/mutators';
import * as sheet from '#server/sheet';
import { resolveName } from '#server/spreadsheet/util';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
import { isSupportedCurrencyCode } from '#shared/fx/currency';
import { parseOwnLines, serializeOwnLines } from '#shared/fx/ownLines';
import {
  getSqlDefaultCurrencyCode,
  isSqlConversionEnabled,
} from '#shared/fx/sql';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type {
  CategoryCurrencyEntity,
  CategoryEntity,
  CategoryGroupEntity,
} from '#types/models';

import * as actions from './actions';
import * as budget from './base';
import { createMissingPreferences, editBudgets } from './budget-rows';
import {
  fromLineMonth,
  getAllCurrencyLines,
  getConvertedFilterSql,
  getCurrencyLine,
  getCurrencyLines,
  getSpendingSql,
  STORED_LINE_JOIN,
  toLineMonth,
} from './category-currencies';
import * as cleanupGroupActions from './cleanup-groups';
import * as cleanupActions from './cleanup-template';
import { storeNoteCleanups } from './cleanup-template-notes';
import { changeDefaultCurrency } from './default-currency';
import * as goalActions from './goal-template';
import { sortCategories } from './sort-categories';
import * as goalNoteActions from './template-notes';

export type BudgetHandlers = {
  'budget/budget-amount': typeof actions.setBudget;
  'budget/copy-previous-month': typeof actions.copyPreviousMonth;
  'budget/copy-single-month': typeof actions.copySinglePreviousMonth;
  'budget/set-zero': typeof actions.setZero;
  'budget/set-3month-avg': typeof actions.set3MonthAvg;
  'budget/set-6month-avg': typeof actions.set6MonthAvg;
  'budget/set-12month-avg': typeof actions.set12MonthAvg;
  'budget/set-n-month-avg': typeof actions.setNMonthAvg;
  'budget/check-templates': typeof goalActions.runCheckTemplates;
  'budget/apply-goal-template': typeof goalActions.applyTemplate;
  'budget/apply-multiple-templates': typeof goalActions.applyMultipleCategoryTemplates;
  'budget/overwrite-goal-template': typeof goalActions.overwriteTemplate;
  'budget/apply-single-template': typeof goalActions.applySingleCategoryTemplate;
  'budget/cleanup-goal-template': typeof cleanupActions.cleanupTemplate;
  'budget/hold-for-next-month': typeof actions.holdForNextMonth;
  'budget/reset-hold': typeof actions.resetHold;
  'budget/cover-overspending': typeof actions.coverOverspending;
  'budget/transfer-available': typeof actions.transferAvailable;
  'budget/cover-overbudgeted': typeof actions.coverOverbudgeted;
  'budget/transfer-category': typeof actions.transferCategory;
  'budget/copy-until-year-end': typeof actions.copyUntilYearEnd;
  'budget/set-carryover': typeof actions.setCategoryCarryover;
  'budget/reset-income-carryover': typeof actions.resetIncomeCarryover;
  'get-categories': typeof getCategories;
  'get-budget-bounds': typeof getBudgetBounds;
  'envelope-budget-month': typeof envelopeBudgetMonth;
  'tracking-budget-month': typeof trackingBudgetMonth;
  'category-create': typeof createCategory;
  'category-update': typeof updateCategory;
  'category-move': typeof moveCategory;
  'categories-sort': typeof sortCategories;
  'category-delete': typeof deleteCategory;
  'get-category-groups': typeof getCategoryGroups;
  'category-group-create': typeof createCategoryGroup;
  'category-group-update': typeof updateCategoryGroup;
  'category-group-move': typeof moveCategoryGroup;
  'category-group-delete': typeof deleteCategoryGroup;
  'must-category-transfer': typeof isCategoryTransferRequired;
  'category-currencies-get': typeof getCategoryCurrencies;
  'category-currency-earlier-spending': typeof getEarlierLineSpending;
  'category-currency-converted-spending': typeof getConvertedLineSpending;
  'category-currency-add': typeof addCategoryCurrency;
  'category-currency-remove': typeof actions.removeCurrencyLine;
  'currency-default-change': typeof changeDefaultCurrency;
  'currency-own-lines-save': typeof saveOwnLines;
  'budget/get-category-automations': typeof goalActions.getTemplatesForCategory;
  'budget/set-category-automations': typeof goalActions.storeTemplates;
  'budget/dry-run-category-template': typeof goalActions.dryRunCategoryTemplate;
  'budget/store-note-templates': typeof goalNoteActions.storeNoteTemplates;
  'budget/store-note-cleanups': typeof storeNoteCleanups;
  'budget/render-note-templates': typeof goalNoteActions.unparse;
  'budget/create-cleanup-group': typeof cleanupGroupActions.createCleanupGroup;
};

export const app = createApp<BudgetHandlers>();

app.method('budget/budget-amount', mutator(undoable(actions.setBudget)));
app.method(
  'budget/copy-previous-month',
  mutator(undoable(actions.copyPreviousMonth)),
);
app.method(
  'budget/copy-single-month',
  mutator(undoable(actions.copySinglePreviousMonth)),
);
app.method('budget/set-zero', mutator(undoable(actions.setZero)));
app.method('budget/set-3month-avg', mutator(undoable(actions.set3MonthAvg)));
app.method('budget/set-6month-avg', mutator(undoable(actions.set6MonthAvg)));
app.method('budget/set-12month-avg', mutator(undoable(actions.set12MonthAvg)));
app.method('budget/set-n-month-avg', mutator(undoable(actions.setNMonthAvg)));
app.method(
  'budget/check-templates',
  mutator(undoable(goalActions.runCheckTemplates)),
);
app.method(
  'budget/apply-goal-template',
  mutator(undoable(goalActions.applyTemplate)),
);
app.method(
  'budget/apply-multiple-templates',
  mutator(undoable(goalActions.applyMultipleCategoryTemplates)),
);
app.method(
  'budget/overwrite-goal-template',
  mutator(undoable(goalActions.overwriteTemplate)),
);
app.method(
  'budget/apply-single-template',
  mutator(undoable(goalActions.applySingleCategoryTemplate)),
);
app.method(
  'budget/cleanup-goal-template',
  mutator(undoable(cleanupActions.cleanupTemplate)),
);
app.method(
  'budget/hold-for-next-month',
  mutator(undoable(actions.holdForNextMonth)),
);
app.method('budget/reset-hold', mutator(undoable(actions.resetHold)));
app.method(
  'budget/cover-overspending',
  mutator(undoable(actions.coverOverspending)),
);
app.method(
  'budget/transfer-available',
  mutator(undoable(actions.transferAvailable)),
);
app.method(
  'budget/cover-overbudgeted',
  mutator(undoable(actions.coverOverbudgeted)),
);
app.method(
  'budget/transfer-category',
  mutator(undoable(actions.transferCategory)),
);
app.method(
  'budget/copy-until-year-end',
  mutator(undoable(actions.copyUntilYearEnd)),
);
app.method(
  'budget/set-carryover',
  mutator(undoable(actions.setCategoryCarryover)),
);
app.method(
  'budget/reset-income-carryover',
  mutator(undoable(actions.resetIncomeCarryover)),
);
app.method('get-categories', getCategories);
app.method('get-budget-bounds', getBudgetBounds);
app.method('envelope-budget-month', envelopeBudgetMonth);
app.method('tracking-budget-month', trackingBudgetMonth);
app.method('category-create', mutator(undoable(createCategory)));
app.method('category-update', mutator(undoable(updateCategory)));
app.method('category-move', mutator(undoable(moveCategory)));
app.method('categories-sort', mutator(undoable(sortCategories)));
app.method('category-delete', mutator(undoable(deleteCategory)));
app.method('get-category-groups', getCategoryGroups);
app.method('category-group-create', mutator(undoable(createCategoryGroup)));
app.method('category-group-update', mutator(undoable(updateCategoryGroup)));
app.method('category-group-move', mutator(undoable(moveCategoryGroup)));
app.method('category-group-delete', mutator(undoable(deleteCategoryGroup)));
app.method('must-category-transfer', isCategoryTransferRequired);
app.method('category-currencies-get', getCategoryCurrencies);
app.method('category-currency-earlier-spending', getEarlierLineSpending);
app.method('category-currency-converted-spending', getConvertedLineSpending);
app.method('category-currency-add', mutator(undoable(addCategoryCurrency)));
app.method(
  'category-currency-remove',
  mutator(undoable(actions.removeCurrencyLine)),
);
app.method('currency-default-change', mutator(undoable(changeDefaultCurrency)));
app.method('currency-own-lines-save', mutator(undoable(saveOwnLines)));

app.method(
  'budget/get-category-automations',
  goalActions.getTemplatesForCategory,
);
app.method(
  'budget/set-category-automations',
  mutator(undoable(goalActions.storeTemplates)),
);
app.method(
  'budget/dry-run-category-template',
  goalActions.dryRunCategoryTemplate,
);
app.method(
  'budget/store-note-templates',
  mutator(goalNoteActions.storeNoteTemplates),
);
app.method('budget/store-note-cleanups', mutator(storeNoteCleanups));
app.method('budget/render-note-templates', goalNoteActions.unparse);
app.method(
  'budget/create-cleanup-group',
  mutator(undoable(cleanupGroupActions.createCleanupGroup)),
);

// Server must return AQL entities not the raw DB data
async function getCategories({ hidden }: { hidden?: boolean } = {}) {
  const categoryGroups = await getCategoryGroups({ hidden });
  let list: CategoryEntity[];
  if (hidden === true) {
    // A hidden category can live in a visible group, so when the caller
    // explicitly asks for hidden categories the flat list must look beyond
    // the (already hidden-filtered) groups returned above.
    const { data }: { data: CategoryEntity[] } = await aqlQuery(
      q('categories').filter({ hidden: true }).select('*'),
    );
    list = data;
  } else {
    list = categoryGroups.flatMap(g => g.categories ?? []);
  }
  return {
    grouped: categoryGroups,
    list,
  };
}

async function getBudgetBounds() {
  return await budget.createAllBudgets();
}

async function envelopeBudgetMonth({ month }: { month: string }) {
  const groups = await db.getCategoriesGrouped();
  const sheetName = monthUtils.sheetForMonth(month);

  function value(name: string) {
    const v = sheet.getCellValue(sheetName, name);
    return { value: v === '' ? 0 : v, name: resolveName(sheetName, name) };
  }

  let values = [
    value('available-funds'),
    value('last-month-overspent'),
    value('buffered'),
    value('total-budgeted'),
    value('to-budget'),

    value('from-last-month'),
    value('total-income'),
    value('total-spent'),
    value('total-leftover'),
  ];

  for (const group of groups) {
    const categories = group.categories ?? [];

    if (group.is_income) {
      values.push(value('total-income'));

      for (const cat of categories) {
        values.push(value(`sum-amount-${cat.id}`));
        values = values.concat(getCurrencyLineValues(cat.id, value));
      }
    } else {
      values = values.concat([
        value(`group-budget-${group.id}`),
        value(`group-sum-amount-${group.id}`),
        value(`group-leftover-${group.id}`),
      ]);

      for (const cat of categories) {
        values = values.concat([
          value(`budget-${cat.id}`),
          value(`sum-amount-${cat.id}`),
          value(`leftover-${cat.id}`),
          value(`carryover-${cat.id}`),
          value(`goal-${cat.id}`),
          value(`long-goal-${cat.id}`),
        ]);
        values = values.concat(getCurrencyLineValues(cat.id, value));
      }
    }
  }

  return values;
}

// The cells of a category's currency lines, and its totals
function getCurrencyLineValues<T>(
  categoryId: CategoryEntity['id'],
  value: (name: string) => T,
): T[] {
  const lines = getCurrencyLines(categoryId);
  if (lines.length === 0) {
    return [];
  }
  return [
    value(`budget-total-${categoryId}`),
    value(`sum-amount-total-${categoryId}`),
    value(`leftover-total-${categoryId}`),
    ...lines.flatMap(line => [
      value(`budget-${line.id}`),
      value(`sum-amount-${line.id}`),
      value(`leftover-${line.id}`),
      value(`carryover-${line.id}`),
    ]),
  ];
}

async function trackingBudgetMonth({ month }: { month: string }) {
  const groups = await db.getCategoriesGrouped();
  const sheetName = monthUtils.sheetForMonth(month);

  function value(name: string) {
    const v = sheet.getCellValue(sheetName, name);
    return { value: v === '' ? 0 : v, name: resolveName(sheetName, name) };
  }

  let values = [
    value('total-budgeted'),
    value('total-budget-income'),
    value('total-saved'),
    value('total-income'),
    value('total-spent'),
    value('real-saved'),
    value('total-leftover'),
  ];

  for (const group of groups) {
    values = values.concat([
      value(`group-budget-${group.id}`),
      value(`group-sum-amount-${group.id}`),
      value(`group-leftover-${group.id}`),
    ]);

    const categories = group.categories ?? [];

    for (const cat of categories) {
      values = values.concat([
        value(`budget-${cat.id}`),
        value(`sum-amount-${cat.id}`),
        value(`leftover-${cat.id}`),
        value(`goal-${cat.id}`),
        value(`long-goal-${cat.id}`),
      ]);

      if (!group.is_income) {
        values.push(value(`carryover-${cat.id}`));
      }
      values = values.concat(getCurrencyLineValues(cat.id, value));
    }
  }

  return values;
}

async function createCategory({
  name,
  groupId,
  isIncome,
  hidden,
}: {
  name: string;
  groupId: CategoryGroupEntity['id'];
  isIncome?: boolean;
  hidden?: boolean;
}): Promise<CategoryEntity['id']> {
  if (!groupId) {
    throw APIError('Creating a category: groupId is required');
  }

  return await db.insertCategory({
    name: name.trim(),
    cat_group: groupId,
    is_income: isIncome ? 1 : 0,
    hidden: hidden ? 1 : 0,
  });
}

async function updateCategory(category: CategoryEntity): Promise<void> {
  try {
    // The API types `fields` as a Partial, and db.update() only writes the
    // keys it is given, so a partial that omits `name` must stay omitted
    // rather than being trimmed into a TypeError (#8857).
    if (category.group !== undefined) {
      if (!category.group) {
        throw APIError('Updating a category: groupId is required');
      }

      const existingGroup = await db.first<{ id: string }>(
        `SELECT id FROM category_groups
       WHERE id = ? AND tombstone = 0`,
        [category.group],
      );

      if (!existingGroup) {
        throw APIError('Updating a category: category group does not exist');
      }
    }

    const payload = {
      ...category,
      ...(category.name !== undefined && {
        name: category.name.trim(),
      }),
    };

    const update = categoryModel.toDb(payload, { update: true });

    const hasWritableField = Object.keys(update).some(key => key !== 'id');

    if (!hasWritableField) {
      throw APIError('No fields to update');
    }

    await db.updateCategory(update);
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.toLowerCase().includes('unique constraint')
    ) {
      throw new Error(
        `A category with the name "${category.name}" already exists.`,
        { cause: e },
      );
    }
    throw e;
  }
}

async function moveCategory({
  id,
  groupId,
  targetId,
}: {
  id: CategoryEntity['id'];
  groupId: CategoryGroupEntity['id'];
  targetId: CategoryEntity['id'] | null;
}): Promise<void> {
  await batchMessages(async () => {
    await db.moveCategory(id, groupId, targetId);
  });
}

async function deleteCategory({
  id,
  transferId,
}: {
  id: CategoryEntity['id'];
  transferId?: CategoryEntity['id'] | null;
}): Promise<void> {
  await batchMessages(async () => {
    const row = await db.first<Pick<db.DbCategory, 'is_income'>>(
      'SELECT is_income FROM categories WHERE id = ?',
      [id],
    );
    if (!row) {
      throw new Error(`Category with id ${id} not found.`);
    }

    const transfer =
      transferId &&
      (await db.first<Pick<db.DbCategory, 'is_income'>>(
        'SELECT is_income FROM categories WHERE id = ?',
        [transferId],
      ));

    if (transferId && !transfer) {
      throw new Error(`Transfer category with id ${transferId} not found.`);
    } else if (
      transferId &&
      row &&
      transfer &&
      row.is_income !== transfer.is_income
    ) {
      throw new Error('Cannot transfer between income and expense categories.');
    }

    // Update spreadsheet values if it's an expense category
    // TODO: We should do this for income too if it's a tracking budget
    if (row.is_income === 0) {
      if (transferId) {
        await budget.doTransfer([id], transferId);
      }
    }
    await actions.clearCurrencyLinesOf([id]);

    await db.deleteCategory({ id }, transferId);
  });
}

// Server must return AQL entities not the raw DB data
async function getCategoryGroups({ hidden }: { hidden?: boolean } = {}) {
  const baseQuery = q('category_groups').select('*');
  const query = hidden === undefined ? baseQuery : baseQuery.filter({ hidden });
  const { data: categoryGroups }: { data: CategoryGroupEntity[] } =
    await aqlQuery(query);
  if (hidden === undefined) {
    return categoryGroups;
  }
  return categoryGroups.map(g => ({
    ...g,
    categories: g.categories?.filter(c => Boolean(c.hidden) === hidden),
  }));
}

async function createCategoryGroup({
  name,
  isIncome,
  hidden,
}: {
  name: CategoryGroupEntity['name'];
  isIncome?: CategoryGroupEntity['is_income'];
  hidden?: CategoryGroupEntity['hidden'];
}): Promise<CategoryGroupEntity['id']> {
  return await db.insertCategoryGroup({
    name,
    is_income: isIncome ? 1 : 0,
    hidden: hidden ? 1 : 0,
  });
}

async function updateCategoryGroup(group: CategoryGroupEntity) {
  await db.updateCategoryGroup(categoryGroupModel.toDb(group));
}

async function moveCategoryGroup({
  id,
  targetId,
}: {
  id: CategoryGroupEntity['id'];
  targetId: CategoryGroupEntity['id'] | null;
}): Promise<void> {
  await batchMessages(async () => {
    await db.moveCategoryGroup(id, targetId);
  });
}

async function deleteCategoryGroup({
  id,
  transferId,
}: {
  id: CategoryGroupEntity['id'];
  transferId?: CategoryGroupEntity['id'] | null;
}): Promise<void> {
  const groupCategories = await db.all<Pick<CategoryEntity, 'id'>>(
    'SELECT id FROM categories WHERE cat_group = ? AND tombstone = 0',
    [id],
  );

  await batchMessages(async () => {
    if (transferId) {
      await budget.doTransfer(
        groupCategories.map(c => c.id),
        transferId,
      );
    }
    await actions.clearCurrencyLinesOf(groupCategories.map(c => c.id));
    await db.deleteCategoryGroup({ id }, transferId);
  });
}

async function isCategoryTransferRequired({
  id,
}: {
  id: CategoryEntity['id'];
}) {
  const res = db.runQuery<{ count: number }>(
    `SELECT count(t.id) as count FROM transactions t
       LEFT JOIN category_mapping cm ON cm.id = t.category
       WHERE cm.transferId = ? AND t.tombstone = 0`,
    [id],
    true,
  );

  // If there are transactions with this category, return early since
  // we already know it needs to be tranferred
  if (res[0].count !== 0) {
    return true;
  }

  // If there are any non-zero budget values, also force the user to
  // transfer the category. Its currency lines count too.
  const lineIds = [id, ...getCurrencyLines(id).map(line => line.id)];
  return [...(sheet.get().meta().createdMonths as Set<string>)].some(month => {
    const sheetName = monthUtils.sheetForMonth(month);
    return lineIds.some(lineId => {
      const value = sheet.get().getCellValue(sheetName, 'budget-' + lineId);
      return value != null && value !== 0;
    });
  });
}

// YYYYMM to 'YYYY-MM'; 0, every month, to null
function toEntityMonth(month: number): string | null {
  return month ? fromLineMonth(month) : null;
}

// The currency lines of categories, the automatic ones included
async function getCategoryCurrencies(): Promise<CategoryCurrencyEntity[]> {
  const rows = await db.getCategoryCurrencies();
  const stored = new Set(rows.map(row => row.id));
  const alive = new Set((await db.getCategories()).map(row => row.id));
  return [
    ...rows.map(row => ({
      id: row.id,
      category: row.category,
      currency: row.currency,
      start_month: toEntityMonth(row.start_month),
    })),
    ...getAllCurrencyLines()
      .filter(
        line =>
          line.automatic && !stored.has(line.id) && alive.has(line.category),
      )
      .map(line => ({
        id: line.id,
        category: line.category,
        currency: line.currency,
        start_month: toEntityMonth(line.startMonth),
        automatic: true,
      })),
  ].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.currency.localeCompare(b.currency),
  );
}

// The currencies other than the default with spending before `month`
// ('YYYY-MM') that isn't on a line yet: what budgeting a currency on its own
// would move out of the earlier months when it starts in the first month
async function getEarlierLineSpending({
  month,
}: {
  month: string;
}): Promise<string[]> {
  if (!isSqlConversionEnabled() || !monthUtils.isValidYearMonth(month)) {
    return [];
  }
  const rows = await db.all<{ currency: string }>(
    `SELECT DISTINCT a.currency AS currency
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account
       ${STORED_LINE_JOIN}
      WHERE t.category IS NOT NULL
        AND a.offbudget = 0
        AND a.currency IS NOT NULL
        AND a.currency <> ?
        AND (cc.id IS NULL OR cc.start_month > t.date / 100)
        AND t.date / 100 < ?
      ORDER BY a.currency`,
    [getSqlDefaultCurrencyCode(), toLineMonth(month)],
  );
  return rows.map(row => row.currency);
}

// The spending of each account in another currency that counts in its
// category converted in `month` ('YYYY-MM'), as the category has no line in
// that currency, in the account's currency
async function getConvertedLineSpending({ month }: { month: string }): Promise<
  Array<{
    category: CategoryEntity['id'];
    account: string;
    currency: string;
    amount: number;
  }>
> {
  if (!isSqlConversionEnabled() || !monthUtils.isValidYearMonth(month)) {
    return [];
  }
  const { join } = getSpendingSql();
  const { start, end } = monthUtils.bounds(month);
  return db.all(
    `SELECT t.category AS category,
            t.account AS account,
            a.currency AS currency,
            SUM(t.amount) AS amount
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account
       ${join}
      WHERE t.date >= ? AND t.date <= ?
        AND t.category IS NOT NULL
        AND a.offbudget = 0
        AND ${getConvertedFilterSql()}
      GROUP BY t.category, t.account, a.currency
     HAVING SUM(t.amount) <> 0
      ORDER BY t.category, a.currency`,
    [start, end],
  );
}

// Budgets `currency` on its own line in a category from `startMonth`
// ('YYYY-MM') on, or in every month without one. A line that starts later
// starts from then.
async function addCategoryCurrency({
  category,
  currency,
  startMonth,
}: {
  category: CategoryEntity['id'];
  currency: string;
  startMonth?: string | null;
}): Promise<CategoryCurrencyEntity['id']> {
  if (!isSqlConversionEnabled()) {
    throw APIError('Multiple currencies are not enabled');
  }
  if (!isSupportedCurrencyCode(currency)) {
    throw APIError(`Unsupported currency: ${currency}`);
  }
  if (currency === getSqlDefaultCurrencyCode()) {
    throw APIError('The default currency is budgeted on the category itself');
  }
  if (startMonth != null && !monthUtils.isValidYearMonth(startMonth)) {
    throw APIError(`Invalid month: ${startMonth}`);
  }
  const row = await db.first<Pick<db.DbCategory, 'id'>>(
    'SELECT id FROM categories WHERE id = ? AND tombstone = 0',
    [category],
  );
  if (!row) {
    throw APIError(`Category with id ${category} not found`);
  }
  const start = startMonth != null ? toLineMonth(startMonth) : 0;
  const line = getCurrencyLine(db.getCategoryCurrencyId(category, currency));
  if (line && line.startMonth <= start) {
    throw APIError(`The category already has a ${currency} line`);
  }

  return await db.insertCategoryCurrency({
    category,
    currency,
    start_month: start,
  });
}

// Chooses the currencies budgeted on lines of their own, as the
// `currency-own-lines` preference stores them. When the user moves earlier
// spending in `moveEarlier` currencies into lines too, their stored lines
// start in every month as well. The stored lines of `dropCurrencies`, which
// are no longer budgeted on their own, go away when the user wants: their
// budgets move into their categories at each month's rate, as removing a
// line does, and their spending is converted there again.
async function saveOwnLines({
  value,
  moveEarlier = [],
  dropCurrencies = [],
}: {
  value: string;
  moveEarlier?: string[];
  dropCurrencies?: string[];
}): Promise<void> {
  const extended = moveEarlier.filter(isSupportedCurrencyCode);
  const dropped = new Set(dropCurrencies);
  const storedLines = await db.all<
    Pick<db.DbCategoryCurrency, 'id' | 'category' | 'currency' | 'start_month'>
  >(
    `SELECT id, category, currency, start_month FROM category_currencies
      WHERE tombstone = 0 AND start_month IS NOT NULL`,
  );
  const droppedLines = storedLines.filter(line => dropped.has(line.currency));
  const defaultCurrency = getSqlDefaultCurrencyCode();
  await createMissingPreferences(['currency-own-lines']);

  await batchMessages(async () => {
    await db.update('preferences', {
      id: 'currency-own-lines',
      value: serializeOwnLines(parseOwnLines(value)),
    });
    for (const line of storedLines) {
      if (extended.includes(line.currency) && line.start_month > 0) {
        await db.update('category_currencies', { id: line.id, start_month: 0 });
      }
    }
    if (droppedLines.length === 0) {
      return;
    }
    await editBudgets(rows => {
      for (const line of droppedLines) {
        rows.convertInto(
          line.id,
          line.category,
          line.currency,
          defaultCurrency,
        );
      }
    });
    for (const line of droppedLines) {
      await db.deleteCategoryCurrency({ id: line.id });
    }
  });
}
