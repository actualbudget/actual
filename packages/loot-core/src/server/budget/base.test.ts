import * as db from '#server/db';
import { app as fxApp } from '#server/fx/app';
import { loadSqlConversionState } from '#server/fx/sqlState';
import * as sheet from '#server/sheet';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';

import { setBudget, setCategoryCarryover } from './actions';
import { createAllBudgets, getBudgetRange, triggerBudgetChanges } from './base';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('getBudgetRange', () => {
  it('keeps 3 months before the start and 12 months after the end', () => {
    const { start, end } = getBudgetRange('2026-01', '2026-10');
    expect(start).toBe('2025-10');
    expect(end).toBe('2027-10');
  });

  it('ignores allocations inside the minimum range', () => {
    expect(getBudgetRange('2026-10', '2026-10', '2027-05').end).toBe('2027-10');
  });

  it('extends 3 months past the latest allocation', () => {
    expect(getBudgetRange('2026-10', '2026-10', '2028-12').end).toBe('2029-03');
  });

  it('never extends more than 5 years ahead', () => {
    expect(getBudgetRange('2026-10', '2026-10', '2099-01').end).toBe('2031-10');
  });
});

describe('Base budget', () => {
  describe.each(['tracking', 'envelope'] as const)(
    'automatic range (%s)',
    budgetType => {
      const table =
        budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
      const otherTable =
        budgetType === 'tracking' ? 'zero_budgets' : 'reflect_budgets';
      const minEnd = () => monthUtils.addMonths(monthUtils.currentMonth(), 12);

      async function loadBudget() {
        await sheet.loadSpreadsheet(db);
        sheet.get().meta().budgetType = budgetType;
      }

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
        await loadBudget();
      });

      it('extends from saved allocations without rebuilding existing months', async () => {
        const initial = await createAllBudgets();
        expect(initial.end).toBe(minEnd());
        const cell = sheet.getCell('budget201701', 'total-budgeted');

        await setBudget({ category: 'planned', month: minEnd(), amount: 200 });
        const extended = await createAllBudgets();
        expect(extended.end).toBe(monthUtils.addMonths(minEnd(), 3));
        expect(sheet.getCell('budget201701', 'total-budgeted')).toBe(cell);

        // Negative amounts are allocations too
        await setBudget({
          category: 'planned',
          month: extended.end,
          amount: -100,
        });
        expect((await createAllBudgets()).end).toBe(
          monthUtils.addMonths(extended.end, 3),
        );
      });

      it('ignores amounts saved for the other budget type', async () => {
        db.runQuery(
          `INSERT INTO ${otherTable} (id, month, category, amount) VALUES (?, ?, ?, ?)`,
          ['202812-planned', 202812, 'planned', 200],
        );
        expect((await createAllBudgets()).end).toBe(minEnd());
      });

      it('stays extended while open and shrinks on the next load', async () => {
        await setBudget({ category: 'planned', month: minEnd(), amount: 200 });
        const { end: extendedEnd } = await createAllBudgets();
        await setBudget({ category: 'planned', month: minEnd(), amount: 0 });
        expect((await createAllBudgets()).end).toBe(extendedEnd);

        sheet.unloadSpreadsheet();
        await loadBudget();
        expect((await createAllBudgets()).end).toBe(minEnd());
      });

      it('applies bulk changes to every visible month', async () => {
        await setBudget({ category: 'planned', month: minEnd(), amount: 200 });
        await createAllBudgets();
        await setBudget({ category: 'planned', month: minEnd(), amount: 0 });
        const { end } = await createAllBudgets();

        await setCategoryCarryover({
          startMonth: monthUtils.currentMonth(),
          category: 'planned',
          flag: true,
        });
        const row = db.firstSync<{ carryover: number }>(
          `SELECT carryover FROM ${table} WHERE month = ? AND category = ?`,
          [parseInt(end.replace('-', '')), 'planned'],
        );
        expect(row?.carryover).toBe(1);
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

  it('Converts category amounts of accounts in another currency', async () => {
    await sheet.loadSpreadsheet(db);

    await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'income',
      is_income: 1,
    });
    const catId = await db.insertCategory({
      name: 'Groceries',
      cat_group: 'group1',
    });

    await db.update('preferences', { id: 'flags.currency', value: 'true' });
    await db.update('preferences', {
      id: 'flags.multiCurrency',
      value: 'true',
    });
    await db.update('preferences', { id: 'defaultCurrencyCode', value: 'CAD' });
    loadSqlConversionState();
    await createAllBudgets();

    await db.insertAccount({ id: 'cad', name: 'Chequing' });
    await db.insertAccount({ id: 'usd', name: 'US Card', currency: 'USD' });
    await db.insertTransaction({
      date: '2017-01-10',
      amount: -1000,
      account: 'cad',
      category: catId,
    });
    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'usd',
      category: catId,
    });
    await sheet.waitOnSpreadsheet();

    const sheetName = monthUtils.sheetForMonth('2017-01');
    // No rate yet: the USD purchase counts 1:1
    expect(sheet.getCellValue(sheetName, `sum-amount-${catId}`)).toBe(-2000);

    // A rate on or before the purchase date converts it
    await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.25,
      date: '2017-01-01',
    });
    await sheet.waitOnSpreadsheet();
    expect(sheet.getCellValue(sheetName, `sum-amount-${catId}`)).toBe(-2250);

    // A later rate doesn't change the past month
    await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 2,
      date: '2017-02-01',
    });
    await sheet.waitOnSpreadsheet();
    expect(sheet.getCellValue(sheetName, `sum-amount-${catId}`)).toBe(-2250);
  });
});

describe('Converted category sums', () => {
  const jan = monthUtils.sheetForMonth('2017-01');
  const mar = monthUtils.sheetForMonth('2017-03');
  let catId: string;
  let janRateId: string;

  async function setPreference(id: string, value: string) {
    await db.update('preferences', { id, value });
  }

  function getSum(sheetName: string, category = catId) {
    return sheet.getCellValue(sheetName, `sum-amount-${category}`);
  }

  // The sum-amount cells recomputed by `change`
  async function getRecomputedSums(change: () => Promise<unknown>) {
    await sheet.waitOnSpreadsheet();
    const recompute = vi.spyOn(sheet.get(), 'recompute');
    try {
      await change();
      await sheet.waitOnSpreadsheet();
      return recompute.mock.calls
        .map(([name]) => name)
        .filter(name => name.includes('!sum-amount-'));
    } finally {
      recompute.mockRestore();
    }
  }

  beforeEach(async () => {
    await sheet.loadSpreadsheet(db);
    await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'income',
      is_income: 1,
    });
    catId = await db.insertCategory({ name: 'Groceries', cat_group: 'group1' });

    await setPreference('flags.currency', 'true');
    await setPreference('flags.multiCurrency', 'true');
    await setPreference('defaultCurrencyCode', 'CAD');
    await db.insertAccount({ id: 'usd', name: 'US Card', currency: 'USD' });
    janRateId = await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.25,
      date: '2017-01-01',
    });
    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'usd',
      category: catId,
    });
    await db.insertTransaction({
      date: '2017-03-15',
      amount: -1000,
      account: 'usd',
      category: catId,
    });

    await createAllBudgets();
    await sheet.waitOnSpreadsheet();
  });

  it('recomputes the converted sums when a rate changes', async () => {
    expect(getSum(jan)).toBe(-1250);
    expect(getSum(mar)).toBe(-1250);

    // A later rate only applies from its date on
    const recomputed = await getRecomputedSums(() =>
      fxApp.handlers['exchange-rate-create']({
        from_currency: 'USD',
        to_currency: 'CAD',
        rate: 2,
        date: '2017-03-01',
      }),
    );
    expect(recomputed).toEqual(
      expect.arrayContaining([
        `${jan}!sum-amount-${catId}`,
        `${mar}!sum-amount-${catId}`,
      ]),
    );
    expect(getSum(jan)).toBe(-1250);
    expect(getSum(mar)).toBe(-2000);

    // The first rate of a pair is also used before its date
    await getRecomputedSums(() =>
      fxApp.handlers['exchange-rate-update']({
        id: janRateId,
        rate: 1.5,
        date: '2017-02-01',
      }),
    );
    expect(getSum(jan)).toBe(-1500);
    expect(getSum(mar)).toBe(-2000);
  });

  it('ignores rates that did not change', async () => {
    const rate = await db.first<db.DbExchangeRate>(
      'SELECT * FROM exchange_rates WHERE id = ?',
      [janRateId],
    );
    const recomputed = await getRecomputedSums(async () =>
      triggerBudgetChanges(
        new Map([['exchange_rates', new Map([[rate.id, rate]])]]),
        new Map([['exchange_rates', new Map([[rate.id, { ...rate }]])]]),
      ),
    );
    expect(recomputed).toEqual([]);
  });

  it('skips deleted transactions and off-budget accounts', async () => {
    const otherCatId = await db.insertCategory({
      name: 'Travel',
      cat_group: 'group1',
    });
    await db.insertAccount({
      id: 'usd-offbudget',
      name: 'US Savings',
      currency: 'USD',
      offbudget: 1,
    });
    await db.insertTransaction({
      date: '2017-03-20',
      amount: -1000,
      account: 'usd-offbudget',
      category: otherCatId,
    });
    const deletedId = await db.insertTransaction({
      date: '2017-03-20',
      amount: -1000,
      account: 'usd',
      category: otherCatId,
    });
    await db.deleteTransaction({ id: deletedId });

    const recomputed = await getRecomputedSums(() =>
      fxApp.handlers['exchange-rate-create']({
        from_currency: 'USD',
        to_currency: 'CAD',
        rate: 2,
        date: '2017-03-01',
      }),
    );
    expect(recomputed.sort()).toEqual(
      [`${jan}!sum-amount-${catId}`, `${mar}!sum-amount-${catId}`].sort(),
    );
  });

  it('recomputes the sums of an account whose currency changes', async () => {
    await db.insertAccount({ id: 'cad', name: 'Chequing' });
    await db.insertTransaction({
      date: '2017-01-20',
      amount: -1000,
      account: 'cad',
      category: catId,
    });
    await sheet.waitOnSpreadsheet();
    expect(getSum(jan)).toBe(-2250);

    await db.update('accounts', { id: 'cad', currency: 'USD' });
    await sheet.waitOnSpreadsheet();
    expect(getSum(jan)).toBe(-2500);

    await db.update('accounts', { id: 'cad', currency: null });
    await sheet.waitOnSpreadsheet();
    expect(getSum(jan)).toBe(-2250);
  });

  it('recomputes the sums when the default currency changes', async () => {
    expect(getSum(jan)).toBe(-1250);

    // USD amounts now count as they are
    await setPreference('defaultCurrencyCode', 'USD');
    await sheet.waitOnSpreadsheet();
    expect(getSum(jan)).toBe(-1000);
    expect(getSum(mar)).toBe(-1000);

    await setPreference('defaultCurrencyCode', 'CAD');
    await sheet.waitOnSpreadsheet();
    expect(getSum(jan)).toBe(-1250);
  });

  it('adds amounts up as they are while multiple currencies are off', async () => {
    await setPreference('flags.multiCurrency', 'false');
    await sheet.waitOnSpreadsheet();
    expect(getSum(jan)).toBe(-1000);
    expect(getSum(mar)).toBe(-1000);

    // Rates and account currencies don't count while it is off
    const recomputed = await getRecomputedSums(async () => {
      await fxApp.handlers['exchange-rate-create']({
        from_currency: 'USD',
        to_currency: 'CAD',
        rate: 2,
        date: '2017-03-01',
      });
      await db.update('accounts', { id: 'usd', currency: 'EUR' });
    });
    expect(recomputed).toEqual([]);
    await db.update('accounts', { id: 'usd', currency: 'USD' });

    await setPreference('flags.multiCurrency', 'true');
    await sheet.waitOnSpreadsheet();
    expect(getSum(jan)).toBe(-1250);
    expect(getSum(mar)).toBe(-2000);
  });
});
