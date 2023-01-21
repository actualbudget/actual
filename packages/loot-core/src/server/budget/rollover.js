import * as monthUtils from '../../shared/months';
import { safeNumber } from '../../shared/util';
import * as sheet from '../sheet';

import { number, sumAmounts, flatten2, unflatten2 } from './util';

const { resolveName } = require('../spreadsheet/util');

function getBlankSheet(months) {
  let blankMonth = monthUtils.prevMonth(months[0]);
  return monthUtils.sheetForMonth(blankMonth, 'rollover');
}

export function createBlankCategory(cat, months) {
  if (months.length > 0) {
    let sheetName = getBlankSheet(months);
    sheet.get().createStatic(sheetName, `carryover-${cat.id}`, false);
    sheet.get().createStatic(sheetName, `leftover-${cat.id}`, 0);
    sheet.get().createStatic(sheetName, `leftover-pos-${cat.id}`, 0);
  }
}

function createBlankMonth(categories, sheetName, months) {
  sheet.get().createStatic(sheetName, 'is-blank', true);
  sheet.get().createStatic(sheetName, 'to-budget', 0);
  sheet.get().createStatic(sheetName, 'buffered', 0);

  categories.forEach(cat => createBlankCategory(cat, months));
}

export function createCategory(cat, sheetName, prevSheetName) {
  if (!cat.is_income) {
    sheet.get().createStatic(sheetName, `budget-${cat.id}`, 0);

    // This makes the app more robust by "fixing up" null budget values.
    // Those should not be allowed, but in case somehow a null value
    // ends up there, we are resilient to it. Preferrably the
    // spreadsheet would have types and be more strict about what is
    // allowed to be set.
    if (sheet.get().getCellValue(sheetName, `budget-${cat.id}`) == null) {
      sheet.get().set(resolveName(sheetName, `budget-${cat.id}`), 0);
    }

    sheet.get().createStatic(sheetName, `carryover-${cat.id}`, false);

    sheet.get().createDynamic(sheetName, `leftover-${cat.id}`, {
      initialValue: 0,
      dependencies: [
        `budget-${cat.id}`,
        `sum-amount-${cat.id}`,
        `${prevSheetName}!carryover-${cat.id}`,
        `${prevSheetName}!leftover-${cat.id}`,
        `${prevSheetName}!leftover-pos-${cat.id}`
      ],
      run: (budgeted, spent, prevCarryover, prevLeftover, prevLeftoverPos) => {
        return safeNumber(
          number(budgeted) +
            number(spent) +
            (prevCarryover ? number(prevLeftover) : number(prevLeftoverPos))
        );
      }
    });

    sheet.get().createDynamic(sheetName, 'leftover-pos-' + cat.id, {
      initialValue: 0,
      dependencies: [`leftover-${cat.id}`],
      run: leftover => {
        return leftover < 0 ? 0 : leftover;
      }
    });
  }
}

export function createSummary(groups, categories, prevSheetName, sheetName) {
  let incomeGroup = groups.filter(group => group.is_income)[0];
  let expenseCategories = categories.filter(cat => !cat.is_income);

  sheet.get().createStatic(sheetName, 'buffered', 0);

  sheet.get().createDynamic(sheetName, 'from-last-month', {
    initialValue: 0,
    dependencies: [`${prevSheetName}!to-budget`, `${prevSheetName}!buffered`],
    run: (toBudget, buffered) => safeNumber(number(toBudget) + number(buffered))
  });

  // Alias the group income total to `total-income`
  sheet.get().createDynamic(sheetName, 'total-income', {
    initialValue: 0,
    dependencies: [`group-sum-amount-${incomeGroup.id}`],
    run: amount => amount
  });

  sheet.get().createDynamic(sheetName, 'available-funds', {
    initialValue: 0,
    dependencies: ['total-income', 'from-last-month'],
    run: (income, fromLastMonth) =>
      safeNumber(number(income) + number(fromLastMonth))
  });

  sheet.get().createDynamic(sheetName, 'last-month-overspent', {
    initialValue: 0,
    dependencies: flatten2(
      expenseCategories.map(cat => [
        `${prevSheetName}!leftover-${cat.id}`,
        `${prevSheetName}!carryover-${cat.id}`
      ])
    ),
    run: (...data) => {
      data = unflatten2(data);
      return safeNumber(
        data.reduce((total, [leftover, carryover]) => {
          if (carryover) {
            return total;
          }
          return total + Math.min(0, number(leftover));
        }, 0)
      );
    }
  });

  sheet.get().createDynamic(sheetName, 'total-budgeted', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-budget-${group.id}`),
    run: (...amounts) => {
      // Negate budgeted amount
      return -sumAmounts(...amounts);
    }
  });

  sheet.get().createDynamic(sheetName, 'buffered', { initialValue: 0 });

  sheet.get().createDynamic(sheetName, 'to-budget', {
    initialValue: 0,
    dependencies: [
      'available-funds',
      'last-month-overspent',
      'total-budgeted',
      'buffered'
    ],
    run: (available, lastOverspent, totalBudgeted, buffered) => {
      return safeNumber(
        number(available) +
          number(lastOverspent) +
          number(totalBudgeted) -
          number(buffered)
      );
    }
  });

  sheet.get().createDynamic(sheetName, 'total-spent', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-sum-amount-${group.id}`),
    run: sumAmounts
  });

  sheet.get().createDynamic(sheetName, 'total-leftover', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-leftover-${group.id}`),
    run: sumAmounts
  });
}

export function createBudget(meta, categories, months) {
  // The spreadsheet is now strict - so we need to fill in some
  // default values for the month before the first month. Only do this
  // if it doesn't already exist
  let blankSheet = getBlankSheet(months);
  if (meta.blankSheet !== blankSheet) {
    sheet.get().clearSheet(meta.blankSheet);
    createBlankMonth(categories, blankSheet, months);
    meta.blankSheet = blankSheet;
  }
}
