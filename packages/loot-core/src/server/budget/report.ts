// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import { safeNumber } from '../../shared/util';
import * as db from '../db';
import * as sheet from '../sheet';
import { resolveName } from '../spreadsheet/util';

import { createCategory as createCategoryFromBase } from './base';
import { number, sumAmounts } from './util';

export async function createCategory(cat, sheetName, prevSheetName) {
  sheet.get().createStatic(sheetName, `budget-${cat.id}`, 0);

  // This makes the app more robust by "fixing up" null budget values.
  // Those should not be allowed, but in case somehow a null value
  // ends up there, we are resilient to it. Preferrably the
  // spreadsheet would have types and be more strict about what is
  // allowed to be set.
  if (sheet.get().getCellValue(sheetName, `budget-${cat.id}`) == null) {
    sheet.get().set(resolveName(sheetName, `budget-${cat.id}`), 0);
  }

  sheet.get().createDynamic(sheetName, `leftover-${cat.id}`, {
    initialValue: 0,
    dependencies: [
      `budget-${cat.id}`,
      `sum-amount-${cat.id}`,
      `${prevSheetName}!carryover-${cat.id}`,
      `${prevSheetName}!leftover-${cat.id}`,
    ],
    run: (budgeted, sumAmount, prevCarryover, prevLeftover) => {
      if (cat.is_income) {
        return safeNumber(
          number(budgeted) -
            number(sumAmount) +
            (prevCarryover ? number(prevLeftover) : 0),
        );
      }

      return safeNumber(
        number(budgeted) +
          number(sumAmount) +
          (prevCarryover ? number(prevLeftover) : 0),
      );
    },
  });
  sheet.get().createDynamic(sheetName, `spent-with-carryover-${cat.id}`, {
    initialValue: 0,
    dependencies: [
      `budget-${cat.id}`,
      `sum-amount-${cat.id}`,
      `carryover-${cat.id}`,
    ],
    // TODO: Why refresh??
    refresh: true,
    run: (budgeted, sumAmount, carryover) => {
      return carryover
        ? Math.max(0, safeNumber(number(budgeted) + number(sumAmount)))
        : sumAmount;
    },
  });

  sheet.get().createStatic(sheetName, `carryover-${cat.id}`, false);
}

export function createCategoryGroup(group, sheetName) {
  // different sum amount dependencies
  sheet.get().createDynamic(sheetName, 'group-sum-amount-' + group.id, {
    initialValue: 0,
    dependencies: group.categories
      .filter(cat => !cat.hidden)
      .map(cat => `sum-amount-${cat.id}`),
    run: sumAmounts,
  });
  sheet.get().createDynamic(sheetName, 'group-budget-' + group.id, {
    initialValue: 0,
    dependencies: group.categories
      .filter(cat => !cat.hidden)
      .map(cat => `budget-${cat.id}`),
    run: sumAmounts,
  });
  sheet.get().createDynamic(sheetName, 'group-leftover-' + group.id, {
    initialValue: 0,
    dependencies: group.categories
      .filter(cat => !cat.hidden)
      .map(cat => `leftover-${cat.id}`),
    run: sumAmounts,
  });
}

export function createSummary(groups, sheetName) {
  const incomeGroup = groups.filter(group => group.is_income)[0];
  const expenseGroups = groups.filter(
    group => !group.is_income && !group.hidden,
  );

  sheet.get().createDynamic(sheetName, 'total-budgeted', {
    initialValue: 0,
    dependencies: expenseGroups.map(group => `group-budget-${group.id}`),
    run: sumAmounts,
  });

  sheet.get().createDynamic(sheetName, 'total-spent', {
    initialValue: 0,
    refresh: true,
    dependencies: expenseGroups.map(group => `group-sum-amount-${group.id}`),
    run: sumAmounts,
  });

  sheet.get().createDynamic(sheetName, 'total-income', {
    initialValue: 0,
    dependencies: [`group-sum-amount-${incomeGroup.id}`],
    run: amount => amount,
  });

  sheet.get().createDynamic(sheetName, 'total-leftover', {
    initialValue: 0,
    dependencies: expenseGroups.map(g => `group-leftover-${g.id}`),
    run: sumAmounts,
  });

  sheet.get().createDynamic(sheetName, 'total-budget-income', {
    initialValue: 0,
    dependencies: [`group-budget-${incomeGroup.id}`],
    run: amount => amount,
  });

  sheet.get().createDynamic(sheetName, 'total-saved', {
    initialValue: 0,
    dependencies: ['total-budget-income', 'total-budgeted'],
    run: (income, budgeted) => {
      return income - budgeted;
    },
  });

  sheet.get().createDynamic(sheetName, 'real-saved', {
    initialValue: 0,
    dependencies: ['total-income', 'total-spent'],
    run: (income, spent) => {
      return safeNumber(income - -spent);
    },
  });
}

export function handleCategoryChange(months, oldValue, newValue) {
  function addDeps(sheetName, groupId, catId) {
    sheet
      .get()
      .addDependencies(sheetName, `group-sum-amount-${groupId}`, [
        `sum-amount-${catId}`,
      ]);
    sheet
      .get()
      .addDependencies(sheetName, `group-budget-${groupId}`, [
        `budget-${catId}`,
      ]);
    sheet
      .get()
      .addDependencies(sheetName, `group-leftover-${groupId}`, [
        `leftover-${catId}`,
      ]);
  }

  function removeDeps(sheetName, groupId, catId) {
    sheet
      .get()
      .removeDependencies(sheetName, `group-sum-amount-${groupId}`, [
        `sum-amount-${catId}`,
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, `group-budget-${groupId}`, [
        `budget-${catId}`,
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, `group-leftover-${groupId}`, [
        `leftover-${catId}`,
      ]);
  }

  if (oldValue && oldValue.tombstone === 0 && newValue.tombstone === 1) {
    const id = newValue.id;
    const groupId = newValue.cat_group;

    months.forEach(month => {
      const sheetName = monthUtils.sheetForMonth(month);
      removeDeps(sheetName, groupId, id);
    });
  } else if (
    newValue.tombstone === 0 &&
    (!oldValue || oldValue.tombstone === 1)
  ) {
    months.forEach(month => {
      const prevMonth = monthUtils.prevMonth(month);
      const prevSheetName = monthUtils.sheetForMonth(prevMonth);
      const sheetName = monthUtils.sheetForMonth(month);
      const { start, end } = monthUtils.bounds(month);

      createCategoryFromBase(newValue, sheetName, prevSheetName, start, end);

      const id = newValue.id;
      const groupId = newValue.cat_group;

      addDeps(sheetName, groupId, id);
    });
  } else if (oldValue && oldValue.cat_group !== newValue.cat_group) {
    // The category moved so we need to update the dependencies
    const id = newValue.id;

    months.forEach(month => {
      const sheetName = monthUtils.sheetForMonth(month);
      removeDeps(sheetName, oldValue.cat_group, id);
      addDeps(sheetName, newValue.cat_group, id);
    });
  } else if (oldValue && oldValue.hidden !== newValue.hidden) {
    const id = newValue.id;
    const groupId = newValue.cat_group;

    months.forEach(month => {
      const sheetName = monthUtils.sheetForMonth(month);
      if (newValue.hidden) {
        removeDeps(sheetName, groupId, id);
      } else {
        addDeps(sheetName, groupId, id);
      }
    });
  }
}

export function handleCategoryGroupChange(months, oldValue, newValue) {
  function addDeps(sheetName, groupId) {
    sheet
      .get()
      .addDependencies(sheetName, 'total-budgeted', [
        `group-budget-${groupId}`,
      ]);
    sheet
      .get()
      .addDependencies(sheetName, 'total-spent', [
        `group-sum-amount-${groupId}`,
      ]);
    sheet
      .get()
      .addDependencies(sheetName, 'total-leftover', [
        `group-leftover-${groupId}`,
      ]);
  }

  function removeDeps(sheetName, groupId) {
    sheet
      .get()
      .removeDependencies(sheetName, 'total-budgeted', [
        `group-budget-${groupId}`,
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, 'total-spent', [
        `group-sum-amount-${groupId}`,
      ]);
    sheet
      .get()
      .removeDependencies(sheetName, 'total-leftover', [
        `group-leftover-${groupId}`,
      ]);
  }

  if (newValue.tombstone === 1 && oldValue && oldValue.tombstone === 0) {
    const id = newValue.id;
    months.forEach(month => {
      const sheetName = monthUtils.sheetForMonth(month);
      removeDeps(sheetName, id);
    });
  } else if (
    newValue.tombstone === 0 &&
    (!oldValue || oldValue.tombstone === 1)
  ) {
    const group = newValue;

    months.forEach(month => {
      const sheetName = monthUtils.sheetForMonth(month);

      // Dirty, dirty hack. These functions should not be async, but this is
      // OK because we're leveraging the sync nature of queries. Ideally we
      // wouldn't be querying here. But I think we have to. At least for now
      // we do
      const categories = db.runQuery(
        'SELECT * FROM categories WHERE tombstone = 0 AND cat_group = ?',
        [group.id],
        true,
      );
      createCategoryGroup({ ...group, categories }, sheetName);

      addDeps(sheetName, group.id);
    });
  } else if (oldValue && oldValue.hidden !== newValue.hidden) {
    const group = newValue;

    months.forEach(month => {
      const sheetName = monthUtils.sheetForMonth(month);
      if (newValue.hidden) {
        removeDeps(sheetName, group.id);
      } else {
        addDeps(sheetName, group.id);
      }
    });
  }
}
