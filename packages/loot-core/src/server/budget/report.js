import { safeNumber } from '../../shared/util';
import * as sheet from '../sheet';

import { number, sumAmounts } from './util';

const { resolveName } = require('../spreadsheet/util');

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
      `${prevSheetName}!leftover-${cat.id}`
    ],
    run: (budgeted, sumAmount, prevCarryover, prevLeftover) => {
      if (cat.is_income) {
        return safeNumber(
          number(budgeted) -
            number(sumAmount) +
            (prevCarryover ? number(prevLeftover) : 0)
        );
      }

      return safeNumber(
        number(budgeted) +
          number(sumAmount) +
          (prevCarryover ? number(prevLeftover) : 0)
      );
    }
  });
  sheet.get().createDynamic(sheetName, `spent-with-carryover-${cat.id}`, {
    initialValue: 0,
    dependencies: [
      `budget-${cat.id}`,
      `sum-amount-${cat.id}`,
      `carryover-${cat.id}`
    ],
    // TODO: Why refresh??
    refresh: true,
    run: (budgeted, sumAmount, carryover) => {
      return carryover
        ? Math.max(0, safeNumber(number(budgeted) + number(sumAmount)))
        : sumAmount;
    }
  });

  sheet.get().createStatic(sheetName, `carryover-${cat.id}`, false);
}

export function createSummary(groups, categories, sheetName) {
  let incomeGroup = groups.filter(group => group.is_income)[0];
  let expenseCategories = categories.filter(cat => !cat.is_income);

  sheet.get().createDynamic(sheetName, 'total-budgeted', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-budget-${group.id}`),
    run: sumAmounts
  });

  sheet.get().createDynamic(sheetName, 'total-spent', {
    initialValue: 0,
    refresh: true,
    dependencies: expenseCategories.map(
      cat => `${sheetName}!spent-with-carryover-${cat.id}`
    ),
    run: sumAmounts
  });

  sheet.get().createDynamic(sheetName, 'total-income', {
    initialValue: 0,
    dependencies: [`group-sum-amount-${incomeGroup.id}`],
    run: amount => amount
  });

  sheet.get().createDynamic(sheetName, 'total-leftover', {
    initialValue: 0,
    dependencies: ['total-budgeted', 'total-spent'],
    run: sumAmounts
  });

  sheet.get().createDynamic(sheetName, 'total-budget-income', {
    initialValue: 0,
    dependencies: [`group-budget-${incomeGroup.id}`],
    run: amount => amount
  });

  sheet.get().createDynamic(sheetName, 'total-saved', {
    initialValue: 0,
    dependencies: ['total-budget-income', 'total-budgeted'],
    run: (income, budgeted) => {
      return income - budgeted;
    }
  });

  sheet.get().createDynamic(sheetName, 'real-saved', {
    initialValue: 0,
    dependencies: ['total-income', 'total-spent'],
    run: (income, spent) => {
      return safeNumber(income - -spent);
    }
  });
}
