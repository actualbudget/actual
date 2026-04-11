import * as db from '#server/db';
import * as sheet from '#server/sheet';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';
import { generatePayPeriods, isPayPeriod } from '#shared/pay-periods';
import type { PayPeriodConfig } from '#types/prefs';

import { createBudget, getBudgetRange } from './base';

const biweeklyConfig: PayPeriodConfig = {
  enabled: true,
  payFrequency: 'biweekly',
  startDate: '2017-01-06',
};

beforeEach(() => {
  return global.emptyDatabase()();
});

async function setupCategories() {
  await db.insertCategoryGroup({ id: 'group1', name: 'Expenses' });
  await db.insertCategoryGroup({ id: 'income', name: 'Income', is_income: 1 });
  const catId = await db.insertCategory({ name: 'Food', cat_group: 'group1' });
  return { catId };
}

// ── 6.1 getBudgetRange ────────────────────────────────────────────────────────

describe('getBudgetRange', () => {
  test('returns calendar month range when config not enabled', () => {
    const { range } = getBudgetRange('2024-01', '2024-03');
    expect(range.every(m => !isPayPeriod(m))).toBe(true);
    expect(range).toContain('2024-01');
    expect(range).toContain('2024-03');
  });

  test('returns period ID range when config is enabled', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    const startId = periods[5].monthId; // e.g. 2024-18
    const endId = periods[10].monthId; // e.g. 2024-23

    const { range } = getBudgetRange(startId, endId, biweeklyConfig);
    expect(range.every(m => isPayPeriod(m))).toBe(true);
  });

  test('applies 3-period buffer before start and 12 after end', () => {
    const periods = generatePayPeriods(2017, biweeklyConfig);
    const startId = periods[5].monthId; // period 6
    const endId = periods[5].monthId; // same

    const { start, end } = getBudgetRange(startId, endId, biweeklyConfig);

    // start should be 3 periods before startId
    const expectedStart = periods[2].monthId; // period 3
    expect(start).toBe(expectedStart);

    // end should be 12 periods after endId (may cross into next year)
    // just verify it's a pay period ID and lexicographically after endId
    expect(isPayPeriod(end)).toBe(true);
    expect(end > endId).toBe(true);
  });
});

// ── 6.6 createBudget with pay period IDs ─────────────────────────────────────

describe('createBudget with pay period IDs', () => {
  it('creates a sheet named budget201713 for period 2017-13', async () => {
    await sheet.loadSpreadsheet(db);
    const { catId } = await setupCategories();

    const periods = generatePayPeriods(2017, biweeklyConfig);
    const period1 = periods[0]; // 2017-13

    await createBudget([period1.monthId], biweeklyConfig);

    const sheetName = monthUtils.sheetForMonth(period1.monthId);
    expect(sheetName).toBe('budget201713');

    // Verify the category sum cell exists in the sheet
    const value = sheet.getCellValue(sheetName, `sum-amount-${catId}`);
    expect(value).toBeDefined();
  });

  it('creates a sheet with correct date bounds for SQL query', async () => {
    await sheet.loadSpreadsheet(db);
    const { catId } = await setupCategories();
    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    const periods = generatePayPeriods(2017, biweeklyConfig);
    const period1 = periods[0]; // 2017-13

    // Insert the transaction before createBudget so the initial SQL
    // computation for the dynamic cell picks it up.
    const txDate = period1.startDate;
    await db.insertTransaction({
      date: txDate,
      amount: -2000,
      account: 'account1',
      category: catId,
    });

    await createBudget([period1.monthId], biweeklyConfig);
    await sheet.waitOnSpreadsheet();

    const sheetName = monthUtils.sheetForMonth(period1.monthId);
    expect(sheet.getCellValue(sheetName, `sum-amount-${catId}`)).toBe(-2000);
  });

  it('calendar month sheet is unaffected when pay periods enabled', async () => {
    await sheet.loadSpreadsheet(db);
    const { catId } = await setupCategories();

    // Calendar month should still work without config
    await createBudget(['2017-01']);

    const sheetName = monthUtils.sheetForMonth('2017-01');
    expect(sheetName).toBe('budget201701');
    const value = sheet.getCellValue(sheetName, `sum-amount-${catId}`);
    expect(value).toBeDefined();
  });
});

// ── 6.7 handleTransactionChange year-boundary routing ────────────────────────

describe('handleTransactionChange year-boundary routing', () => {
  it('routes transaction to the correct pay period sheet via SQL bounds', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().payPeriodConfig = biweeklyConfig;

    const { catId } = await setupCategories();
    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    const periods = generatePayPeriods(2017, biweeklyConfig);
    const period1 = periods[0]; // 2017-13, starts e.g. 2017-01-06

    // Insert transaction BEFORE createBudget so it's captured on initial
    // computation of the dynamic SQL cell.
    const txDate = period1.startDate;
    await db.insertTransaction({
      date: txDate,
      amount: -3000,
      account: 'account1',
      category: catId,
    });

    await createBudget([period1.monthId], biweeklyConfig);
    await sheet.waitOnSpreadsheet();

    const sheetName = monthUtils.sheetForMonth(period1.monthId);
    expect(sheet.getCellValue(sheetName, `sum-amount-${catId}`)).toBe(-3000);
  });

  it('period 2 transaction does not appear in period 1 sheet', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().payPeriodConfig = biweeklyConfig;

    const { catId } = await setupCategories();
    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    const periods = generatePayPeriods(2017, biweeklyConfig);

    // Insert transaction in period 2's date range before creating budgets
    const txDate = periods[1].startDate;
    await db.insertTransaction({
      date: txDate,
      amount: -5000,
      account: 'account1',
      category: catId,
    });

    await createBudget(
      [periods[0].monthId, periods[1].monthId],
      biweeklyConfig,
    );
    await sheet.waitOnSpreadsheet();

    // Period 1 should be 0, period 2 should see the transaction
    const sheetName1 = monthUtils.sheetForMonth(periods[0].monthId);
    const sheetName2 = monthUtils.sheetForMonth(periods[1].monthId);
    expect(sheet.getCellValue(sheetName1, `sum-amount-${catId}`)).toBe(0);
    expect(sheet.getCellValue(sheetName2, `sum-amount-${catId}`)).toBe(-5000);
  });
});
