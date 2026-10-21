import * as db from '#server/db';
import { runHandler } from '#server/mutators';
import type { BudgetType } from '#server/prefs';
import * as sheet from '#server/sheet';
import { redo, undo } from '#server/undo';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';

import {
  copyUntilYearEnd,
  getBudget,
  setBudget,
  setCategoryCarryover,
} from './actions';
import { app as budgetApp } from './app';
import { createAllBudgets, getBudgetRange, setType } from './base';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('Base budget', () => {
  describe('automatic tracking budget range', () => {
    beforeEach(async () => {
      await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
      await db.insertCategoryGroup({
        id: 'income',
        name: 'Income',
        is_income: 1,
      });
      await db.insertCategory({
        id: 'planned',
        name: 'Planned',
        cat_group: 'expenses',
      });
      db.runQuery(
        "INSERT INTO preferences (id, value) VALUES ('budgetType', 'tracking')",
      );
      await sheet.loadSpreadsheet(db);
      sheet.get().meta().budgetType = 'tracking';
    });

    it.each([
      ['2027-07', 100, '2027-10'],
      ['2027-09', 100, '2027-12'],
      ['2027-12', -100, '2028-03'],
      ['2033-12', 100, '2034-03'],
      ['2033-12', 0, '2027-10'],
    ])(
      'uses a three-month buffer after %s with amount %s',
      async (month, amount, end) => {
        await setBudget({ category: 'planned', month, amount });
        expect(getBudgetRange('2026-10', '2026-10').end).toBe(end);
      },
    );

    it('keeps the default range without allocations or with carryover-only rows', async () => {
      expect(getBudgetRange('2026-10', '2026-10')).toMatchObject({
        start: '2026-07',
        end: '2027-10',
      });
      await db.insert('reflect_budgets', {
        id: '203312-planned',
        month: 203312,
        category: 'planned',
        carryover: 1,
        goal: 100,
      });
      expect(getBudgetRange('2026-10', '2026-10').end).toBe('2027-10');
    });

    it('shrinks when the latest allocation is cleared without removing other plans', async () => {
      await setBudget({ category: 'planned', month: '2027-12', amount: 100 });
      await setBudget({ category: 'planned', month: '2028-12', amount: 200 });
      expect(getBudgetRange('2026-10', '2026-10').end).toBe('2029-03');
      await setBudget({ category: 'planned', month: '2028-12', amount: 0 });
      expect(getBudgetRange('2026-10', '2026-10').end).toBe('2028-03');
      expect(getBudget({ category: 'planned', month: '2027-12' })).toBe(100);
    });

    it('restores the range from saved allocations after reopening', async () => {
      await setBudget({ category: 'planned', month: '2028-12', amount: 200 });
      sheet.unloadSpreadsheet();
      await sheet.loadSpreadsheet(db);
      sheet.get().meta().budgetType = 'tracking';
      expect(getBudgetRange('2026-10', '2026-10').end).toBe('2029-03');
      expect(getBudget({ category: 'planned', month: '2028-12' })).toBe(200);
    });

    it('does not extend envelope budgets', async () => {
      await setBudget({ category: 'planned', month: '2028-12', amount: 200 });
      sheet.get().meta().budgetType = 'envelope';
      expect(getBudgetRange('2026-10', '2026-10').end).toBe('2027-10');
    });

    it('extends the range for an income allocation alone', async () => {
      await db.insertCategory({
        id: 'salary',
        name: 'Salary',
        cat_group: 'income',
        is_income: 1,
      });
      const month = monthUtils.addMonths(monthUtils.currentMonth(), 24);
      await setBudget({ category: 'salary', month, amount: 200 });
      expect((await createAllBudgets()).end).toBe(
        monthUtils.addMonths(month, 3),
      );
    });

    it('preserves the tracking plan when switching to envelope and back', async () => {
      const { end } = await createAllBudgets();
      const month = monthUtils.addMonths(end, 12);
      await setBudget({ category: 'planned', month, amount: 200 });
      expect((await createAllBudgets()).end).toBe(
        monthUtils.addMonths(month, 3),
      );

      db.runQuery(
        "UPDATE preferences SET value = 'envelope' WHERE id = 'budgetType'",
      );
      expect((await setType('envelope'))?.end).toBe(end);
      expect(getBudget({ category: 'planned', month })).toBe(0);

      db.runQuery(
        "UPDATE preferences SET value = 'tracking' WHERE id = 'budgetType'",
      );
      expect((await setType('tracking'))?.end).toBe(
        monthUtils.addMonths(month, 3),
      );
      expect(getBudget({ category: 'planned', month })).toBe(200);
    });

    it('extends incrementally without creating allocations or rebuilding existing cells', async () => {
      const initial = await createAllBudgets();
      const existingCell = sheet.getCell('budget201701', 'total-budgeted');
      expect(await db.all('SELECT * FROM reflect_budgets')).toHaveLength(0);
      await setBudget({ category: 'planned', month: initial.end, amount: 200 });
      const extended = await createAllBudgets();
      expect(extended.end).toBe(monthUtils.addMonths(initial.end, 3));
      expect(sheet.getCell('budget201701', 'total-budgeted')).toBe(
        existingCell,
      );
      expect(await db.all('SELECT * FROM reflect_budgets')).toHaveLength(1);
      expect(
        sheet.getCellValue(
          monthUtils.sheetForMonth(initial.end),
          'total-budgeted',
        ),
      ).toBe(200);
      await setBudget({ category: 'planned', month: initial.end, amount: 0 });
      expect((await createAllBudgets()).end).toBe(initial.end);
    });

    it('updates the range after undo and redo of an allocation', async () => {
      const month = monthUtils.addMonths(monthUtils.currentMonth(), 12);
      await runHandler(budgetApp.handlers['budget/budget-amount'], {
        category: 'planned',
        month,
        amount: 200,
      });
      expect((await createAllBudgets()).end).toBe(
        monthUtils.addMonths(month, 3),
      );
      await undo();
      expect((await createAllBudgets()).end).toBe(month);
      await redo();
      expect((await createAllBudgets()).end).toBe(
        monthUtils.addMonths(month, 3),
      );
    });

    it('preserves allocations before future sheets are created when deleting an expense category', async () => {
      await createAllBudgets();
      const month = monthUtils.addMonths(monthUtils.currentMonth(), 24);
      await setBudget({ category: 'planned', month, amount: 200 });
      await db.insertCategory({
        id: 'target',
        name: 'Target',
        cat_group: 'expenses',
      });
      await setBudget({ category: 'target', month, amount: 50 });
      expect(
        await budgetApp.handlers['must-category-transfer']({ id: 'planned' }),
      ).toBe(true);
      await runHandler(budgetApp.handlers['category-delete'], {
        id: 'planned',
        transferId: 'target',
      });
      expect(getBudget({ category: 'target', month })).toBe(250);
      expect(
        await db.all('SELECT * FROM reflect_budgets WHERE category = ?', [
          'target',
        ]),
      ).toHaveLength(1);
      await undo();
      expect(getBudget({ category: 'target', month })).toBe(50);
      expect((await db.getCategory('planned'))?.tombstone).toBe(0);
      await redo();
      expect(getBudget({ category: 'target', month })).toBe(250);
      expect((await db.getCategory('planned'))?.tombstone).toBe(1);
    });

    it.each(['tracking', 'envelope'] satisfies BudgetType[])(
      'transfers saved group allocations without empty rows and supports undo (%s)',
      async budgetType => {
        db.runQuery(
          "UPDATE preferences SET value = ? WHERE id = 'budgetType'",
          [budgetType],
        );
        sheet.get().meta().budgetType = budgetType;
        const table =
          budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
        await createAllBudgets();
        await db.insertCategory({
          id: 'second',
          name: 'Second',
          cat_group: 'expenses',
        });
        await db.insertCategoryGroup({ id: 'other', name: 'Other' });
        await db.insertCategory({
          id: 'target',
          name: 'Target',
          cat_group: 'other',
        });
        const month = monthUtils.addMonths(monthUtils.currentMonth(), 24);
        const nextMonth = monthUtils.addMonths(month, 1);
        await setBudget({ category: 'planned', month, amount: 200 });
        await setBudget({ category: 'second', month, amount: -80 });
        await setBudget({ category: 'second', month: nextMonth, amount: -40 });
        await setBudget({ category: 'target', month, amount: 50 });

        await runHandler(budgetApp.handlers['category-group-delete'], {
          id: 'expenses',
          transferId: 'target',
        });
        expect(getBudget({ category: 'target', month })).toBe(170);
        expect(getBudget({ category: 'target', month: nextMonth })).toBe(-40);
        expect(
          await db.all(`SELECT * FROM ${table} WHERE category = ?`, ['target']),
        ).toHaveLength(2);
        await undo();
        expect(getBudget({ category: 'target', month })).toBe(50);
        expect(getBudget({ category: 'target', month: nextMonth })).toBe(0);
        expect((await db.getCategory('planned'))?.tombstone).toBe(0);
        expect((await db.getCategory('second'))?.tombstone).toBe(0);
        await redo();
        expect(getBudget({ category: 'target', month })).toBe(170);
        expect(getBudget({ category: 'target', month: nextMonth })).toBe(-40);
      },
    );

    it('ignores allocations belonging to deleted categories', async () => {
      await setBudget({ category: 'planned', month: '2028-12', amount: 200 });
      await db.deleteCategory({ id: 'planned' });
      expect(getBudgetRange('2026-10', '2026-10').end).toBe('2027-10');
    });

    it.each([false, true])(
      'limits bulk actions to the current range after shrinking (carryover: %s)',
      async isCarryover => {
        const previousCurrentMonth = global.currentMonth;
        global.currentMonth = '2017-10';
        try {
          await setBudget({
            category: 'planned',
            month: '2019-10',
            amount: 100,
          });
          await createAllBudgets();
          await setBudget({ category: 'planned', month: '2019-10', amount: 0 });
          await setBudget({
            category: 'planned',
            month: '2018-07',
            amount: 200,
          });
          expect((await createAllBudgets()).end).toBe('2018-10');
          async function applyAction() {
            if (isCarryover) {
              await setCategoryCarryover({
                startMonth: '2018-07',
                category: 'planned',
                flag: true,
              });
            } else {
              await copyUntilYearEnd({ month: '2018-07', category: 'planned' });
            }
          }
          await applyAction();
          const cachedResult = await db.all(
            'SELECT * FROM reflect_budgets ORDER BY month',
          );
          expect(getBudget({ category: 'planned', month: '2018-11' })).toBe(0);
          expect(
            db.firstSync<{ carryover: number }>(
              "SELECT carryover FROM reflect_budgets WHERE month = 201811 AND category = 'planned'",
            )?.carryover ?? 0,
          ).toBe(0);
          if (!isCarryover) {
            for (const month of ['2018-08', '2018-09', '2018-10']) {
              await setBudget({ category: 'planned', month, amount: 0 });
            }
          }
          sheet.unloadSpreadsheet();
          await sheet.loadSpreadsheet(db);
          sheet.get().meta().budgetType = 'tracking';
          await createAllBudgets();
          await applyAction();
          expect(
            await db.all('SELECT * FROM reflect_budgets ORDER BY month'),
          ).toEqual(cachedResult);
        } finally {
          global.currentMonth = previousCurrentMonth;
        }
      },
    );

    it('preserves explicit carryover behavior across the extension boundary', async () => {
      const { end } = await createAllBudgets();
      await setCategoryCarryover({
        startMonth: end,
        category: 'planned',
        flag: true,
      });
      await setBudget({ category: 'planned', month: end, amount: 200 });
      const extended = await createAllBudgets();
      const next = monthUtils.addMonths(end, 1);
      const following = monthUtils.addMonths(end, 2);
      expect(
        sheet.getCellValue(monthUtils.sheetForMonth(next), 'leftover-planned'),
      ).toBe(200);
      expect(
        sheet.getCellValue(
          monthUtils.sheetForMonth(following),
          'leftover-planned',
        ),
      ).toBe(0);
      await setCategoryCarryover({
        startMonth: next,
        category: 'planned',
        flag: true,
      });
      await sheet.waitOnSpreadsheet();
      expect(
        sheet.getCellValue(
          monthUtils.sheetForMonth(extended.end),
          'leftover-planned',
        ),
      ).toBe(200);
      expect((await createAllBudgets()).end).toBe(extended.end);
    });
  });

  it('Recomputes budget cells when account fields change', async () => {
    await sheet.loadSpreadsheet(db);

    await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'income',
      is_income: 1,
    });
    const catId = await db.insertCategory({
      name: 'foo',
      cat_group: 'group1',
    });

    await createAllBudgets();

    // Insert a transaction referencing an account that doesn't exist
    // yet
    await db.insertTransaction({
      date: '2016-12-15',
      amount: -5000,
      account: '29eef937-9933-49ef-80d9-71627074cf31',
      category: catId,
    });

    // Make sure that the spreadsheet finishes processing to make sure
    // the next change doesn't get batched in with it
    await sheet.waitOnSpreadsheet();

    // The category should have nothing spent on it yet
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2016-12'),
        `sum-amount-${catId}`,
      ),
    ).toBe(0);

    // Create the referenced account
    await db.insertAccount({
      id: '29eef937-9933-49ef-80d9-71627074cf31',
      name: 'foo',
    });

    // Make sure the spreadsheet finishes processing
    await sheet.waitOnSpreadsheet();

    // The category should see the transaction
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2016-12'),
        `sum-amount-${catId}`,
      ),
    ).toBe(-5000);
  });

  it('Excludes hidden categories from group totals in Tracking Budget', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'tracking';

    // Create a group with multiple categories
    await db.insertCategoryGroup({ id: 'group1', name: 'Test Group' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });

    const visibleCatId = await db.insertCategory({
      name: 'Visible Category',
      cat_group: 'group1',
    });

    const hiddenCatId = await db.insertCategory({
      name: 'Hidden Category',
      cat_group: 'group1',
      hidden: 1,
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify individual category amounts
    expect(sheet.getCellValue(sheetName, `sum-amount-${visibleCatId}`)).toBe(
      -1000,
    );

    expect(sheet.getCellValue(sheetName, `sum-amount-${hiddenCatId}`)).toBe(
      -2000,
    );

    // Verify group total only includes visible category
    expect(sheet.getCellValue(sheetName, `group-sum-amount-group1`)).toBe(
      -1000,
    );

    // Now toggle hidden status of the hidden category to make it visible
    await db.updateCategory({
      id: hiddenCatId,
      name: 'Hidden Category',
      cat_group: 'group1',
      is_income: 0,
      hidden: 0,
    });

    await sheet.waitOnSpreadsheet();

    // After making hidden category visible, group total should include both
    expect(sheet.getCellValue(sheetName, `group-sum-amount-group1`)).toBe(
      -3000,
    );
  });

  it('Excludes hidden category groups from budget totals in Tracking Budget', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'tracking';

    // Create two expense groups - one visible, one hidden
    await db.insertCategoryGroup({
      id: 'visible-group',
      name: 'Visible Group',
    });
    await db.insertCategoryGroup({
      id: 'hidden-group',
      name: 'Hidden Group',
      hidden: 1,
    });

    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });

    const visibleGroupCatId = await db.insertCategory({
      name: 'Visible Group Category',
      cat_group: 'visible-group',
    });

    const hiddenGroupCatId = await db.insertCategory({
      name: 'Hidden Group Category',
      cat_group: 'hidden-group',
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleGroupCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenGroupCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify individual amounts
    expect(
      sheet.getCellValue(sheetName, `sum-amount-${visibleGroupCatId}`),
    ).toBe(-1000);

    expect(
      sheet.getCellValue(sheetName, `sum-amount-${hiddenGroupCatId}`),
    ).toBe(-2000);

    expect(
      sheet.getCellValue(sheetName, `group-sum-amount-visible-group`),
    ).toBe(-1000);

    expect(sheet.getCellValue(sheetName, `group-sum-amount-hidden-group`)).toBe(
      -2000,
    );

    // Verify total spent only includes visible group
    expect(sheet.getCellValue(sheetName, 'total-spent')).toBe(-1000);

    // Now toggle hidden status of the hidden group to make it visible
    await db.updateCategoryGroup({
      id: 'hidden-group',
      name: 'Hidden Group',
      is_income: 0,
      hidden: 0,
    });

    await sheet.waitOnSpreadsheet();

    // After making hidden group visible, total should include both
    expect(sheet.getCellValue(sheetName, 'total-spent')).toBe(-3000);
  });

  it('Includes hidden categories in group totals for Envelope Budget', async () => {
    await sheet.loadSpreadsheet(db);
    // Envelope is the default, but explicit for clarity
    sheet.get().meta().budgetType = 'envelope';

    // Create a group with multiple categories
    await db.insertCategoryGroup({ id: 'group1', name: 'Test Group' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });

    const visibleCatId = await db.insertCategory({
      name: 'Visible Category',
      cat_group: 'group1',
    });

    const hiddenCatId = await db.insertCategory({
      name: 'Hidden Category',
      cat_group: 'group1',
      hidden: 1,
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify group total includes both visible and hidden category amounts
    expect(sheet.getCellValue(sheetName, `group-sum-amount-group1`)).toBe(
      -3000,
    );
  });

  it('Includes hidden category groups in budget totals for Envelope Budget', async () => {
    await sheet.loadSpreadsheet(db);
    // Envelope is the default, but explicit for clarity
    sheet.get().meta().budgetType = 'envelope';

    // Create two expense groups - one visible, one hidden
    await db.insertCategoryGroup({
      id: 'visible-group',
      name: 'Visible Group',
    });
    await db.insertCategoryGroup({
      id: 'hidden-group',
      name: 'Hidden Group',
      hidden: 1,
    });

    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });

    const visibleGroupCatId = await db.insertCategory({
      name: 'Visible Group Category',
      cat_group: 'visible-group',
    });

    const hiddenGroupCatId = await db.insertCategory({
      name: 'Hidden Group Category',
      cat_group: 'hidden-group',
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleGroupCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenGroupCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify total spent includes both visible and hidden group amounts
    expect(sheet.getCellValue(sheetName, 'total-spent')).toBe(-3000);
  });

  it('Seeds sum-amount across all months on a cold build (Envelope Budget)', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'envelope';

    await db.insertCategoryGroup({ id: 'group1', name: 'Expenses' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });
    const foodId = await db.insertCategory({
      name: 'Food',
      cat_group: 'group1',
    });
    const rentId = await db.insertCategory({
      name: 'Rent',
      cat_group: 'group1',
    });

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    // Insert transactions across multiple months *before* building the
    // budgets, so the cold build seeds the sum-amount cells from the
    // batched query rather than per-cell queries.
    await db.insertTransaction({
      date: '2017-01-10',
      amount: -1000,
      account: 'account1',
      category: foodId,
    });
    await db.insertTransaction({
      date: '2017-01-20',
      amount: -500,
      account: 'account1',
      category: foodId,
    });
    await db.insertTransaction({
      date: '2017-02-15',
      amount: -2500,
      account: 'account1',
      category: foodId,
    });
    await db.insertTransaction({
      date: '2017-01-05',
      amount: -90000,
      account: 'account1',
      category: rentId,
    });
    await db.insertTransaction({
      date: '2017-03-01',
      amount: -90000,
      account: 'account1',
      category: rentId,
    });

    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    const jan = monthUtils.sheetForMonth('2017-01');
    const feb = monthUtils.sheetForMonth('2017-02');
    const mar = monthUtils.sheetForMonth('2017-03');

    // Per-category seeded sums
    expect(sheet.getCellValue(jan, `sum-amount-${foodId}`)).toBe(-1500);
    expect(sheet.getCellValue(feb, `sum-amount-${foodId}`)).toBe(-2500);
    expect(sheet.getCellValue(mar, `sum-amount-${foodId}`)).toBe(0);
    expect(sheet.getCellValue(jan, `sum-amount-${rentId}`)).toBe(-90000);
    // A category with no transactions in a month seeds to 0
    expect(sheet.getCellValue(feb, `sum-amount-${rentId}`)).toBe(0);
    expect(sheet.getCellValue(mar, `sum-amount-${rentId}`)).toBe(-90000);

    // Downstream cells read the seeded values correctly
    expect(sheet.getCellValue(jan, 'group-sum-amount-group1')).toBe(-91500);
    expect(sheet.getCellValue(feb, 'group-sum-amount-group1')).toBe(-2500);
    expect(sheet.getCellValue(jan, `leftover-${foodId}`)).toBe(-1500);
  });

  it('Seeds sum-amount across all months on a cold build (Tracking Budget)', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'tracking';

    await db.insertCategoryGroup({ id: 'group1', name: 'Expenses' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });
    const foodId = await db.insertCategory({
      name: 'Food',
      cat_group: 'group1',
    });
    const rentId = await db.insertCategory({
      name: 'Rent',
      cat_group: 'group1',
    });

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-10',
      amount: -1500,
      account: 'account1',
      category: foodId,
    });
    await db.insertTransaction({
      date: '2017-01-05',
      amount: -90000,
      account: 'account1',
      category: rentId,
    });
    await db.insertTransaction({
      date: '2017-02-15',
      amount: -2500,
      account: 'account1',
      category: foodId,
    });

    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    const jan = monthUtils.sheetForMonth('2017-01');
    const feb = monthUtils.sheetForMonth('2017-02');

    expect(sheet.getCellValue(jan, `sum-amount-${foodId}`)).toBe(-1500);
    expect(sheet.getCellValue(jan, `sum-amount-${rentId}`)).toBe(-90000);
    expect(sheet.getCellValue(feb, `sum-amount-${foodId}`)).toBe(-2500);
    expect(sheet.getCellValue(jan, 'total-spent')).toBe(-91500);
    expect(sheet.getCellValue(feb, 'total-spent')).toBe(-2500);
  });

  it('Excludes off-budget account spending when seeding sum-amount', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'envelope';

    await db.insertCategoryGroup({ id: 'group1', name: 'Expenses' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });
    const foodId = await db.insertCategory({
      name: 'Food',
      cat_group: 'group1',
    });

    await db.insertAccount({ id: 'onbudget', name: 'On budget' });
    await db.insertAccount({
      id: 'offbudget',
      name: 'Off budget',
      offbudget: 1,
    });

    await db.insertTransaction({
      date: '2017-01-10',
      amount: -1000,
      account: 'onbudget',
      category: foodId,
    });
    // Off-budget spending must not be counted, matching the per-cell query.
    await db.insertTransaction({
      date: '2017-01-12',
      amount: -5000,
      account: 'offbudget',
      category: foodId,
    });

    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    const jan = monthUtils.sheetForMonth('2017-01');
    expect(sheet.getCellValue(jan, `sum-amount-${foodId}`)).toBe(-1000);
  });
});
