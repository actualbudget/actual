import * as db from '#server/db';
import * as sheet from '#server/sheet';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';

import { copyUntilYearEnd, getBudget, setBudget } from './actions';
import { createAllBudgets, getBudgetRange } from './base';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('Base budget', () => {
  describe.each(['tracking', 'envelope'] as const)(
    'automatic range (%s)',
    budgetType => {
      beforeEach(async () => {
        await db.insertCategoryGroup({
          id: 'income',
          name: 'Income',
          is_income: 1,
        });
        await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
        await db.insertCategory({
          id: 'planned',
          name: 'Planned',
          cat_group: 'expenses',
        });
        db.runQuery(
          "INSERT INTO preferences (id, value) VALUES ('budgetType', ?)",
          [budgetType],
        );
        await sheet.loadSpreadsheet(db);
        sheet.get().meta().budgetType = budgetType;
      });

      it('extends from saved allocations and shrinks without rebuilding cached months', async () => {
        const initial = await createAllBudgets();
        expect(initial.end).toBe(
          monthUtils.addMonths(monthUtils.currentMonth(), 12),
        );
        const cell = sheet.getCell('budget201701', 'total-budgeted');
        await setBudget({
          category: 'planned',
          month: initial.end,
          amount: 200,
        });
        const extended = await createAllBudgets();
        expect(extended.end).toBe(monthUtils.addMonths(initial.end, 3));
        expect(sheet.getCell('budget201701', 'total-budgeted')).toBe(cell);
        await setBudget({
          category: 'planned',
          month: extended.end,
          amount: -100,
        });
        expect((await createAllBudgets()).end).toBe(
          monthUtils.addMonths(extended.end, 3),
        );
        await setBudget({
          category: 'planned',
          month: extended.end,
          amount: 0,
        });
        expect((await createAllBudgets()).end).toBe(extended.end);
        expect(getBudget({ category: 'planned', month: initial.end })).toBe(
          200,
        );
        await setBudget({ category: 'planned', month: initial.end, amount: 0 });
        expect((await createAllBudgets()).end).toBe(initial.end);
        expect(sheet.getCell('budget201701', 'total-budgeted')).toBe(cell);
      });

      it('uses only the active mode and restores the range on reopening', async () => {
        await setBudget({ category: 'planned', month: '2028-12', amount: 200 });
        sheet.unloadSpreadsheet();
        await sheet.loadSpreadsheet(db);
        sheet.get().meta().budgetType = budgetType;
        expect(getBudgetRange('2026-10', '2026-10').end).toBe('2029-03');
        sheet.get().meta().budgetType =
          budgetType === 'tracking' ? 'envelope' : 'tracking';
        expect(getBudgetRange('2026-10', '2026-10').end).toBe('2027-10');
      });

      it('keeps bulk copies inside the reduced range', async () => {
        const { end } = await createAllBudgets();
        const distantMonth = monthUtils.addMonths(end, 12);
        await setBudget({
          category: 'planned',
          month: distantMonth,
          amount: 100,
        });
        await createAllBudgets();
        await setBudget({
          category: 'planned',
          month: distantMonth,
          amount: 0,
        });
        await createAllBudgets();
        const month = end;
        await setBudget({ category: 'planned', month, amount: 200 });
        const { end: reducedEnd } = await createAllBudgets();
        await copyUntilYearEnd({ month, category: 'planned' });
        expect(getBudget({ category: 'planned', month: reducedEnd })).toBe(200);
        expect(
          getBudget({
            category: 'planned',
            month: monthUtils.addMonths(reducedEnd, 1),
          }),
        ).toBe(0);
      });
    },
  );

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
