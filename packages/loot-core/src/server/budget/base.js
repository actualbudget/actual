import * as monthUtils from '../../shared/months';
import { getChangedValues } from '../../shared/util';
import * as db from '../db';
import * as sheet from '../sheet';
import { resolveName } from '../spreadsheet/util';

import * as budgetActions from './actions';
import * as report from './report';
import * as rollover from './rollover';
import { sumAmounts } from './util';

export function getBudgetType() {
  let meta = sheet.get().meta();
  return meta.budgetType || 'rollover';
}

export function getBudgetRange(start, end) {
  start = monthUtils.getMonth(start);
  end = monthUtils.getMonth(end);

  // The start date should never be after the end date. If that
  // happened, the month range might be a valid range and weird
  // things happen
  if (start > end) {
    start = end;
  }

  // Budgets should exist 3 months before the earliest needed date
  // (either the oldest transaction or the current month if no
  // transactions yet), and a year from the current date. There's no
  // need to ever have budgets outside that range.
  start = monthUtils.subMonths(start, 3);
  end = monthUtils.addMonths(end, 12);

  return { start, end, range: monthUtils.rangeInclusive(start, end) };
}

function createCategory(cat, sheetName, prevSheetName, start, end) {
  sheet.get().createDynamic(sheetName, 'sum-amount-' + cat.id, {
    initialValue: 0,
    run: () => {
      // Making this sync is faster!
      let rows = db.runQuery(
        `SELECT SUM(amount) as amount FROM v_transactions_internal_alive t
           LEFT JOIN accounts a ON a.id = t.account
         WHERE t.date >= ${start} AND t.date <= ${end}
           AND category = '${cat.id}' AND a.offbudget = 0`,
        [],
        true
      );
      let row = rows[0];
      let amount = row ? row.amount : 0;
      return amount || 0;
    }
  });

  if (getBudgetType() === 'rollover') {
    rollover.createCategory(cat, sheetName, prevSheetName);
  } else {
    report.createCategory(cat, sheetName, prevSheetName);
  }
}

function createCategoryGroup(group, sheetName) {
  sheet.get().createDynamic(sheetName, 'group-sum-amount-' + group.id, {
    initialValue: 0,
    dependencies: group.categories.map(cat => `sum-amount-${cat.id}`),
    run: sumAmounts
  });

  if (!group.is_income || getBudgetType() !== 'rollover') {
    sheet.get().createDynamic(sheetName, 'group-budget-' + group.id, {
      initialValue: 0,
      dependencies: group.categories.map(cat => `budget-${cat.id}`),
      run: sumAmounts
    });

    sheet.get().createDynamic(sheetName, 'group-leftover-' + group.id, {
      initialValue: 0,
      dependencies: group.categories.map(cat => `leftover-${cat.id}`),
      run: sumAmounts
    });
  }
}

function handleAccountChange(months, oldValue, newValue) {
  if (!oldValue || oldValue.offbudget !== newValue.offbudget) {
    let rows = db.runQuery(
      `
        SELECT DISTINCT(category) as category FROM transactions
        WHERE acct = ?
      `,
      [newValue.id],
      true
    );

    months.forEach(month => {
      let sheetName = monthUtils.sheetForMonth(month, getBudgetType());

      rows.forEach(row => {
        sheet
          .get()
          .recompute(resolveName(sheetName, 'sum-amount-' + row.category));
      });
    });
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
    let month = monthUtils.monthFromDate(db.fromDateRepr(transaction.date));
    let sheetName = monthUtils.sheetForMonth(month, getBudgetType());

    sheet
      .get()
      .recompute(resolveName(sheetName, 'sum-amount-' + transaction.category));
  }
}

function handleCategoryMappingChange(months, oldValue, newValue) {
  months.forEach(month => {
    let sheetName = monthUtils.sheetForMonth(month, getBudgetType());
    if (oldValue) {
      sheet
        .get()
        .recompute(resolveName(sheetName, 'sum-amount-' + oldValue.transferId));
    }
    sheet
      .get()
      .recompute(resolveName(sheetName, 'sum-amount-' + newValue.transferId));
  });
}

function handleCategoryChange(months, oldValue, newValue) {
  function addDeps(sheetName, groupId, catId) {
    sheet
      .get()
      .addDependencies(sheetName, `group-sum-amount-${groupId}`, [
        `sum-amount-${catId}`
      ]);
    sheet
      .get()
      .addDependencies(sheetName, `group-budget-${groupId}`, [
        `budget-${catId}`
      ]);
    sheet
      .get()
      .addDependencies(sheetName, `group-leftover-${groupId}`, [
        `leftover-${catId}`
      ]);
  }

  function removeDeps(sheetName, groupId, catId) {
    sheet
      .get()
      .removeDependencies(sheetName, `group-sum-amount-${groupId}`, [
        `sum-amount-${catId}`
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, `group-budget-${groupId}`, [
        `budget-${catId}`
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, `group-leftover-${groupId}`, [
        `leftover-${catId}`
      ]);
  }

  let budgetType = getBudgetType();

  if (oldValue && oldValue.tombstone === 0 && newValue.tombstone === 1) {
    let id = newValue.id;
    let groupId = newValue.cat_group;

    months.forEach(month => {
      let sheetName = monthUtils.sheetForMonth(month);
      removeDeps(sheetName, groupId, id);
    });
  } else if (
    newValue.tombstone === 0 &&
    (!oldValue || oldValue.tombstone === 1)
  ) {
    if (budgetType === 'rollover') {
      rollover.createBlankCategory(newValue, months);
    }

    months.forEach(month => {
      let prevMonth = monthUtils.prevMonth(month);
      let prevSheetName = monthUtils.sheetForMonth(prevMonth, budgetType);
      let sheetName = monthUtils.sheetForMonth(month, budgetType);
      let { start, end } = monthUtils.bounds(month);

      createCategory(newValue, sheetName, prevSheetName, start, end);

      let id = newValue.id;
      let groupId = newValue.cat_group;

      if (getBudgetType() === 'rollover') {
        sheet
          .get()
          .addDependencies(sheetName, 'last-month-overspent', [
            `${prevSheetName}!leftover-${id}`,
            `${prevSheetName}!carryover-${id}`
          ]);
      }

      addDeps(sheetName, groupId, id);
    });
  } else if (oldValue && oldValue.cat_group !== newValue.cat_group) {
    // The category moved so we need to update the dependencies
    let id = newValue.id;

    months.forEach(month => {
      let sheetName = monthUtils.sheetForMonth(month, budgetType);
      removeDeps(sheetName, oldValue.cat_group, id);
      addDeps(sheetName, newValue.cat_group, id);
    });
  }
}

function handleCategoryGroupChange(months, oldValue, newValue) {
  let budgetType = getBudgetType();

  function addDeps(sheetName, groupId) {
    sheet
      .get()
      .addDependencies(sheetName, 'total-budgeted', [
        `group-budget-${groupId}`
      ]);
    sheet
      .get()
      .addDependencies(sheetName, 'total-spent', [
        `group-sum-amount-${groupId}`
      ]);
    sheet
      .get()
      .addDependencies(sheetName, 'total-leftover', [
        `group-leftover-${groupId}`
      ]);
  }

  function removeDeps(sheetName, groupId) {
    sheet
      .get()
      .removeDependencies(sheetName, 'total-budgeted', [
        `group-budget-${groupId}`
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, 'total-spent', [
        `group-sum-amount-${groupId}`
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, 'total-leftover', [
        `group-leftover-${groupId}`
      ]);
  }

  if (newValue.tombstone === 1 && oldValue && oldValue.tombstone === 0) {
    let id = newValue.id;
    months.forEach(month => {
      let sheetName = monthUtils.sheetForMonth(month, budgetType);
      removeDeps(sheetName, id);
    });
  } else if (
    newValue.tombstone === 0 &&
    (!oldValue || oldValue.tombstone === 1)
  ) {
    let group = newValue;

    if (!group.is_income || budgetType !== 'rollover') {
      months.forEach(month => {
        let sheetName = monthUtils.sheetForMonth(month, budgetType);

        // Dirty, dirty hack. These functions should not be async, but this is
        // OK because we're leveraging the sync nature of queries. Ideally we
        // wouldn't be querying here. But I think we have to. At least for now
        // we do
        let categories = db.runQuery(
          'SELECT * FROM categories WHERE tombstone = 0 AND cat_group = ?',
          [group.id],
          true
        );
        createCategoryGroup({ ...group, categories }, sheetName);

        addDeps(sheetName, group.id);
      });
    }
  }
}

function handleBudgetMonthChange(budget) {
  let sheetName = monthUtils.sheetForMonth(budget.id);
  sheet.get().set(`${sheetName}!buffered`, budget.buffered);
}

function handleBudgetChange(budget) {
  if (budget.category) {
    let sheetName = monthUtils.sheetForMonth(budget.month.toString());
    sheet
      .get()
      .set(`${sheetName}!budget-${budget.category}`, budget.amount || 0);
    sheet
      .get()
      .set(
        `${sheetName}!carryover-${budget.category}`,
        budget.carryover === 1 ? true : false
      );
  }
}

export function triggerBudgetChanges(oldValues, newValues) {
  let { createdMonths = new Set() } = sheet.get().meta();
  sheet.startTransaction();

  try {
    newValues.forEach((items, table) => {
      let old = oldValues.get(table);

      items.forEach(newValue => {
        let oldValue = old && old.get(newValue.id);

        if (table === 'zero_budget_months') {
          handleBudgetMonthChange(newValue);
        } else if (table === 'zero_budgets' || table === 'reflect_budgets') {
          handleBudgetChange(newValue);
        } else if (table === 'transactions') {
          let changed = new Set(
            Object.keys(getChangedValues(oldValue || {}, newValue) || {})
          );

          if (oldValue) {
            handleTransactionChange(oldValue, changed);
          }
          handleTransactionChange(newValue, changed);
        } else if (table === 'category_mapping') {
          handleCategoryMappingChange(createdMonths, oldValue, newValue);
        } else if (table === 'categories') {
          handleCategoryChange(createdMonths, oldValue, newValue);
        } else if (table === 'category_groups') {
          handleCategoryGroupChange(createdMonths, oldValue, newValue);
        } else if (table === 'accounts') {
          handleAccountChange(createdMonths, oldValue, newValue);
        }
      });
    });
  } finally {
    sheet.endTransaction();
  }
}

export async function doTransfer(categoryIds, transferId) {
  let { createdMonths: months } = sheet.get().meta();

  [...months].forEach(month => {
    let totalValue = categoryIds
      .map(id => {
        return budgetActions.getBudget({ month, category: id });
      })
      .reduce((total, value) => total + value, 0);

    let transferValue = budgetActions.getBudget({
      month,
      category: transferId
    });

    budgetActions.setBudget({
      month,
      category: transferId,
      amount: totalValue + transferValue
    });
  });
}

export async function createBudget(months) {
  const categories = await db.getCategories();
  const groups = await db.getCategoriesGrouped();

  sheet.startTransaction();
  let meta = sheet.get().meta();
  meta.createdMonths = meta.createdMonths || new Set();

  let budgetType = getBudgetType();

  if (budgetType === 'rollover') {
    rollover.createBudget(meta, categories, months);
  }

  months.forEach(month => {
    if (!meta.createdMonths.has(month)) {
      let prevMonth = monthUtils.prevMonth(month);
      let { start, end } = monthUtils.bounds(month);
      let sheetName = monthUtils.sheetForMonth(month, budgetType);
      let prevSheetName = monthUtils.sheetForMonth(prevMonth, budgetType);

      categories.forEach(cat => {
        createCategory(cat, sheetName, prevSheetName, start, end);
      });
      groups.forEach(group => {
        createCategoryGroup(group, sheetName);
      });

      if (budgetType === 'rollover') {
        rollover.createSummary(groups, categories, prevSheetName, sheetName);
      } else {
        report.createSummary(groups, categories, sheetName);
      }

      meta.createdMonths.add(month);
    }
  });

  sheet.get().setMeta(meta);
  sheet.endTransaction();

  // Wait for the spreadsheet to finish computing. Normally this won't
  // do anything (as values are cached) but on first run this need to
  // show the loading screen while it initially sets up.
  await sheet.waitOnSpreadsheet();
}

export async function createAllBudgets() {
  let earliestTransaction = await db.first(
    'SELECT * FROM transactions WHERE isChild=0 AND date IS NOT NULL ORDER BY date ASC LIMIT 1'
  );
  let earliestDate =
    earliestTransaction && db.fromDateRepr(earliestTransaction.date);
  let currentMonth = monthUtils.currentMonth();

  // Get the range based off of the earliest transaction and the
  // current month. If no transactions currently exist the current
  // month is also used as the starting month
  let { start, end, range } = getBudgetRange(
    earliestDate || currentMonth,
    currentMonth
  );

  let meta = sheet.get().meta();
  let createdMonths = meta.createdMonths || new Set();
  let newMonths = range.filter(m => !createdMonths.has(m));

  if (newMonths.length > 0) {
    await createBudget(range);
  }

  return { start, end };
}

export async function setType(type) {
  let meta = sheet.get().meta();
  if (type === meta.budgetType) {
    return;
  }

  meta.budgetType = type;
  meta.createdMonths = new Set();

  // Go through and force all the cells to be recomputed
  let nodes = sheet.get().getNodes();
  db.transaction(() => {
    for (let name of nodes.keys()) {
      let [sheetName, cellName] = name.split('!');
      if (sheetName.match(/^budget\d+/)) {
        sheet.get().deleteCell(sheetName, cellName);
      }
    }
  });

  sheet.get().startCacheBarrier();
  sheet.loadUserBudgets(db);
  let bounds = await createAllBudgets();
  sheet.get().endCacheBarrier();

  return bounds;
}
