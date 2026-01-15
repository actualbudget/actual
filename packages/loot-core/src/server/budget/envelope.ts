// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import { safeNumber } from '../../shared/util';
import * as db from '../db';
import * as sheet from '../sheet';
import { resolveName } from '../spreadsheet/util';

import { createCategory as createCategoryFromBase } from './base';
import { flatten2, number, sumAmounts, unflatten2 } from './util';

function getBlankSheet(months) {
  const blankMonth = monthUtils.prevMonth(months[0]);
  return monthUtils.sheetForMonth(blankMonth);
}

export function createBlankCategory(cat, months) {
  if (months.length > 0) {
    const sheetName = getBlankSheet(months);
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
        `${prevSheetName}!leftover-pos-${cat.id}`,
      ],
      run: (budgeted, spent, prevCarryover, prevLeftover, prevLeftoverPos) => {
        return safeNumber(
          number(budgeted) +
            number(spent) +
            (prevCarryover ? number(prevLeftover) : number(prevLeftoverPos)),
        );
      },
    });

    sheet.get().createDynamic(sheetName, 'leftover-pos-' + cat.id, {
      initialValue: 0,
      dependencies: [`leftover-${cat.id}`],
      run: leftover => {
        return leftover < 0 ? 0 : leftover;
      },
    });
  }
}

export function createCategoryGroup(group, sheetName) {
  sheet.get().createDynamic(sheetName, 'group-sum-amount-' + group.id, {
    initialValue: 0,
    dependencies: group.categories.map(cat => `sum-amount-${cat.id}`),
    run: sumAmounts,
  });

  if (!group.is_income) {
    sheet.get().createDynamic(sheetName, 'group-budget-' + group.id, {
      initialValue: 0,
      dependencies: group.categories.map(cat => `budget-${cat.id}`),
      run: sumAmounts,
    });

    sheet.get().createDynamic(sheetName, 'group-leftover-' + group.id, {
      initialValue: 0,
      dependencies: group.categories.map(cat => `leftover-${cat.id}`),
      run: sumAmounts,
    });
  }
}

export function createSummary(
  groups,
  categories,
  prevSheetName,
  sheetName,
  start: number,
  end: number,
  currencies: string[] = [],
  defaultCurrencyCode: string | null = null,
) {
  const incomeGroup = groups.filter(group => group.is_income)[0];
  const expenseCategories = categories.filter(cat => !cat.is_income);
  const incomeCategories = categories.filter(cat => cat.is_income);

  sheet.get().createStatic(sheetName, 'buffered', 0);

  sheet.get().createDynamic(sheetName, 'from-last-month', {
    initialValue: 0,
    dependencies: [
      `${prevSheetName}!to-budget`,
      `${prevSheetName}!buffered-selected`,
    ],
    run: (toBudget, buffered) =>
      safeNumber(number(toBudget) + number(buffered)),
  });

  // Alias the group income total to `total-income`
  sheet.get().createDynamic(sheetName, 'total-income', {
    initialValue: 0,
    dependencies: [`group-sum-amount-${incomeGroup.id}`],
    run: amount => amount,
  });

  sheet.get().createDynamic(sheetName, 'available-funds', {
    initialValue: 0,
    dependencies: ['total-income', 'from-last-month'],
    run: (income, fromLastMonth) =>
      safeNumber(number(income) + number(fromLastMonth)),
  });

  sheet.get().createDynamic(sheetName, 'last-month-overspent', {
    initialValue: 0,
    dependencies: flatten2(
      expenseCategories.map(cat => [
        `${prevSheetName}!leftover-${cat.id}`,
        `${prevSheetName}!carryover-${cat.id}`,
      ]),
    ),
    run: (...data) => {
      data = unflatten2(data);
      return safeNumber(
        data.reduce((total, [leftover, carryover]) => {
          if (carryover) {
            return total;
          }
          return total + Math.min(0, number(leftover));
        }, 0),
      );
    },
  });

  sheet.get().createDynamic(sheetName, 'total-budgeted', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-budget-${group.id}`),
    run: (...amounts) => {
      // Negate budgeted amount
      return -sumAmounts(...amounts);
    },
  });

  sheet.get().createDynamic(sheetName, 'buffered', { initialValue: 0 });
  sheet.get().createDynamic(sheetName, 'buffered-auto', {
    initialValue: 0,
    dependencies: flatten2(
      incomeCategories.map(c => [
        `${sheetName}!sum-amount-${c.id}`,
        `${sheetName}!carryover-${c.id}`,
      ]),
    ),
    run: (...data) => {
      data = unflatten2(data);
      return safeNumber(
        data.reduce((total, [sumAmount, carryover]) => {
          if (carryover) {
            return total + sumAmount;
          }
          return total;
        }, 0),
      );
    },
  });
  sheet.get().createDynamic(sheetName, 'buffered-selected', {
    initialValue: 0,
    dependencies: [`${sheetName}!buffered`, `${sheetName}!buffered-auto`],
    run: (man, auto) => {
      if (man !== 0) {
        return man;
      }
      return auto;
    },
  });

  sheet.get().createDynamic(sheetName, 'to-budget', {
    initialValue: 0,
    dependencies: [
      'available-funds',
      'last-month-overspent',
      'total-budgeted',
      'buffered-selected',
    ],
    run: (available, lastOverspent, totalBudgeted, buffered) => {
      return safeNumber(
        number(available) +
          number(lastOverspent) +
          number(totalBudgeted) -
          number(buffered),
      );
    },
  });

  sheet.get().createDynamic(sheetName, 'total-spent', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-sum-amount-${group.id}`),
    run: sumAmounts,
  });

  sheet.get().createDynamic(sheetName, 'total-leftover', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-leftover-${group.id}`),
    run: sumAmounts,
  });

  // Per-currency budget totals (only when multi-currency is enabled)
  if (currencies.length > 0 && defaultCurrencyCode) {
    for (const currencyCode of currencies) {
      const isDefault = currencyCode === defaultCurrencyCode;

      if (isDefault) {
        // Default currency: alias main calculations for backwards compatibility
        // This ensures existing budgets work correctly and includes all
        // categories without an explicit currency assignment
        sheet.get().createDynamic(sheetName, `total-budgeted-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['total-budgeted'],
          run: totalBudgeted => totalBudgeted,
        });

        sheet.get().createDynamic(sheetName, `total-income-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['total-income'],
          run: income => income,
        });

        sheet
          .get()
          .createDynamic(sheetName, `from-last-month-${currencyCode}`, {
            initialValue: 0,
            dependencies: ['from-last-month'],
            run: fromLastMonth => fromLastMonth,
          });

        sheet
          .get()
          .createDynamic(sheetName, `available-funds-${currencyCode}`, {
            initialValue: 0,
            dependencies: ['available-funds'],
            run: available => available,
          });

        sheet
          .get()
          .createDynamic(sheetName, `last-month-overspent-${currencyCode}`, {
            initialValue: 0,
            dependencies: ['last-month-overspent'],
            run: overspent => overspent,
          });

        sheet.get().createDynamic(sheetName, `buffered-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['buffered-selected'],
          run: buffered => buffered,
        });

        sheet.get().createDynamic(sheetName, `to-budget-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['to-budget'],
          run: toBudget => toBudget,
        });

        sheet.get().createDynamic(sheetName, `total-spent-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['total-spent'],
          run: spent => spent,
        });

        sheet.get().createDynamic(sheetName, `total-leftover-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['total-leftover'],
          run: leftover => leftover,
        });
      } else {
        // Non-default currencies: calculate separately based on account currency
        // Categories for this currency
        const currencyCategories = expenseCategories.filter(
          cat => cat.currency === currencyCode,
        );

        // Total budgeted for this currency
        sheet.get().createDynamic(sheetName, `total-budgeted-${currencyCode}`, {
          initialValue: 0,
          dependencies: currencyCategories.map(cat => `budget-${cat.id}`),
          run: (...amounts) =>
            amounts.length > 0 ? -sumAmounts(...amounts) : 0,
        });

        // Total income: sum native amounts from accounts with this currency
        sheet.get().createDynamic(sheetName, `total-income-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['total-income'], // Trigger recalc when any income changes
          run: () => {
            const incomeTotal = db.runQuery<{ amount: number }>(
              `SELECT SUM(t.amount) as amount
               FROM v_transactions_internal_alive t
               LEFT JOIN accounts a ON a.id = t.account
               LEFT JOIN categories c ON c.id = t.category
               WHERE t.date >= ? AND t.date <= ?
                 AND c.is_income = 1
                 AND a.offbudget = 0
                 AND a.currency_code = ?`,
              [start, end, currencyCode],
              true,
            );
            return incomeTotal[0]?.amount || 0;
          },
        });

        // Carryover from last month
        sheet
          .get()
          .createDynamic(sheetName, `from-last-month-${currencyCode}`, {
            initialValue: 0,
            dependencies: [
              `${prevSheetName}!to-budget-${currencyCode}`,
              `${prevSheetName}!buffered-${currencyCode}`,
            ],
            run: (toBudget, buffered) =>
              safeNumber(number(toBudget || 0) + number(buffered || 0)),
          });

        // Available funds
        sheet
          .get()
          .createDynamic(sheetName, `available-funds-${currencyCode}`, {
            initialValue: 0,
            dependencies: [
              `total-income-${currencyCode}`,
              `from-last-month-${currencyCode}`,
            ],
            run: (income, fromLastMonth) =>
              safeNumber(number(income) + number(fromLastMonth)),
          });

        // Last month overspent
        sheet
          .get()
          .createDynamic(sheetName, `last-month-overspent-${currencyCode}`, {
            initialValue: 0,
            dependencies:
              currencyCategories.length > 0
                ? flatten2(
                    currencyCategories.map(cat => [
                      `${prevSheetName}!leftover-${cat.id}`,
                      `${prevSheetName}!carryover-${cat.id}`,
                    ]),
                  )
                : [],
            run: (...data) => {
              if (data.length === 0) return 0;
              data = unflatten2(data);
              return safeNumber(
                data.reduce((total, [leftover, carryover]) => {
                  if (carryover) {
                    return total;
                  }
                  return total + Math.min(0, number(leftover));
                }, 0),
              );
            },
          });

        // Buffered amount (for next month) - static value
        sheet.get().createStatic(sheetName, `buffered-${currencyCode}`, 0);

        // To-budget
        sheet.get().createDynamic(sheetName, `to-budget-${currencyCode}`, {
          initialValue: 0,
          dependencies: [
            `available-funds-${currencyCode}`,
            `last-month-overspent-${currencyCode}`,
            `total-budgeted-${currencyCode}`,
            `buffered-${currencyCode}`,
          ],
          run: (available, lastOverspent, totalBudgeted, buffered) => {
            return safeNumber(
              number(available) +
                number(lastOverspent) +
                number(totalBudgeted) -
                number(buffered),
            );
          },
        });

        // Total spent: sum spending from accounts with this currency
        sheet.get().createDynamic(sheetName, `total-spent-${currencyCode}`, {
          initialValue: 0,
          dependencies: ['total-spent'],
          run: () => {
            const spentTotal = db.runQuery<{ amount: number }>(
              `SELECT SUM(t.amount) as amount
               FROM v_transactions_internal_alive t
               LEFT JOIN accounts a ON a.id = t.account
               LEFT JOIN categories c ON c.id = t.category
               WHERE t.date >= ? AND t.date <= ?
                 AND (c.is_income = 0 OR c.is_income IS NULL)
                 AND a.offbudget = 0
                 AND a.currency_code = ?`,
              [start, end, currencyCode],
              true,
            );
            return spentTotal[0]?.amount || 0;
          },
        });

        // Total leftover
        sheet.get().createDynamic(sheetName, `total-leftover-${currencyCode}`, {
          initialValue: 0,
          dependencies: currencyCategories.map(cat => `leftover-${cat.id}`),
          run: (...amounts) =>
            amounts.length > 0 ? sumAmounts(...amounts) : 0,
        });
      }
    }
  }
}

export function createBudget(meta, categories, months) {
  // The spreadsheet is now strict - so we need to fill in some
  // default values for the month before the first month. Only do this
  // if it doesn't already exist
  const blankSheet = getBlankSheet(months);
  if (meta.blankSheet !== blankSheet) {
    sheet.get().clearSheet(meta.blankSheet);
    createBlankMonth(categories, blankSheet, months);
    meta.blankSheet = blankSheet;
  }
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
    createBlankCategory(newValue, months);

    months.forEach(month => {
      const prevMonth = monthUtils.prevMonth(month);
      const prevSheetName = monthUtils.sheetForMonth(prevMonth);
      const sheetName = monthUtils.sheetForMonth(month);
      const { start, end } = monthUtils.bounds(month);

      createCategoryFromBase(newValue, sheetName, prevSheetName, start, end);

      const id = newValue.id;
      const groupId = newValue.cat_group;

      sheet
        .get()
        .addDependencies(sheetName, 'last-month-overspent', [
          `${prevSheetName}!leftover-${id}`,
          `${prevSheetName}!carryover-${id}`,
        ]);

      addDeps(sheetName, groupId, id);
      if (newValue.is_income) {
        sheet
          .get()
          .addDependencies(
            sheetName,
            'buffered-auto',
            flatten2([
              `${sheetName}!sum-amount-${id}`,
              `${sheetName}!carryover-${id}`,
            ]),
          );
      }
    });
  } else if (oldValue && oldValue.cat_group !== newValue.cat_group) {
    // The category moved so we need to update the dependencies
    const id = newValue.id;

    months.forEach(month => {
      const sheetName = monthUtils.sheetForMonth(month);
      removeDeps(sheetName, oldValue.cat_group, id);
      addDeps(sheetName, newValue.cat_group, id);
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

    if (!group.is_income) {
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
    }
  }
}
