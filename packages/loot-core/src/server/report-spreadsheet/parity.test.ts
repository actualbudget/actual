import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setBudget } from '#server/budget/actions';
import * as budget from '#server/budget/base';
import * as db from '#server/db';
import { reportModel } from '#server/reports/app';
import * as sheet from '#server/sheet';
import type {
  CustomReportEntity,
  DashboardWidgetEntity,
  NetWorthWidget,
} from '#types/models';

import * as reports from './service';

const { emptyDatabase } = global as typeof globalThis & {
  emptyDatabase: () => () => Promise<void>;
};

const month = '2016-01';
const timeFrame = { start: month, end: month, mode: 'static' } as const;
const accountCondition = {
  field: 'account',
  op: 'is',
  type: 'id',
  value: 'checking',
} as const;

async function addWidget(widget: Pick<DashboardWidgetEntity, 'type' | 'meta'>) {
  await db.insertWithSchema('dashboard', {
    ...widget,
    id: 'widget',
    dashboard_page_id: 'page',
    width: 3,
    height: 2,
    x: 0,
    y: 0,
  });
}

async function readReport() {
  await reports.waitOnReportSpreadsheet();
  const cell = await reports.getCell({ widgetId: 'widget' });
  const value = cell?.value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected report data');
  }
  return value;
}

async function prepare() {
  await reports.prepareDashboard({ dashboardPageId: 'page' });
  return readReport();
}

async function reloadCache() {
  const expected = await readReport();
  reports.unloadReportSpreadsheet();
  const { cells } = await reports.prepareDashboard({ dashboardPageId: 'page' });
  expect(cells.widget.value).toEqual(expected);
  expect(await readReport()).toEqual(expected);
}

async function addExpense() {
  await db.insertTransaction({
    id: 'expense',
    account: 'checking',
    category: 'groceries',
    date: '2016-01-05',
    amount: -20_000,
  });
}

const customReport: CustomReportEntity = {
  id: 'custom',
  name: 'Expenses',
  startDate: '2016-01-01',
  endDate: '2016-01-31',
  isDateStatic: true,
  dateRange: 'Last 6 months',
  mode: 'total',
  groupBy: 'Category',
  interval: 'Monthly',
  balanceType: 'Payment',
  sortBy: 'desc',
  showEmpty: false,
  showOffBudget: false,
  showHiddenCategories: true,
  includeCurrentInterval: true,
  showUncategorized: true,
  trimIntervals: false,
  showTrendLines: false,
  graphType: 'BarGraph',
  conditions: [],
  conditionsOp: 'and',
};

describe('cached report value parity', () => {
  beforeEach(async () => {
    reports.unloadReportSpreadsheet();
    await emptyDatabase()();
    await db.insertWithSchema('dashboard_pages', {
      id: 'page',
      name: 'Dashboard',
    });
    await db.insertAccount({ id: 'checking', name: 'Checking' });
    await db.insertCategoryGroup({
      id: 'income',
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategoryGroup({
      id: 'expenses',
      name: 'Expenses',
      is_income: 0,
    });
    await db.insertCategory({
      id: 'groceries',
      name: 'Groceries',
      cat_group: 'expenses',
      is_income: 0,
    });
  });

  afterEach(async () => {
    await reports.waitOnReportSpreadsheet();
    reports.unloadReportSpreadsheet();
    sheet.unloadSpreadsheet();
  });

  it.each(['and', 'or'] as const)(
    'preserves net worth %s filters on first calculation, reload and updates',
    async conditionsOp => {
      await addWidget({
        type: 'net-worth-card',
        meta: { timeFrame, conditions: [accountCondition], conditionsOp },
      });
      await db.insertAccount({ id: 'other', name: 'Other' });
      await db.insertTransaction({
        id: 'selected',
        account: 'checking',
        amount: 10_000,
        date: '2016-01-05',
      });
      await db.insertTransaction({
        id: 'excluded',
        account: 'other',
        amount: 20_000,
        date: '2016-01-05',
      });
      expect((await prepare()).netWorth).toBe(10_000);
      await reloadCache();
      await db.updateTransaction({ id: 'selected', amount: 15_000 });
      expect((await readReport()).netWorth).toBe(15_000);
    },
  );

  it.each(['Daily', 'Weekly', 'Monthly', 'Yearly'] satisfies NonNullable<
    NetWorthWidget['meta']
  >['interval'][])(
    'includes closed account history in %s net worth',
    async interval => {
      await addWidget({
        type: 'net-worth-card',
        meta: { timeFrame, interval },
      });
      await db.insertAccount({ id: 'closed', name: 'Closed', closed: 1 });
      await db.insertTransaction({
        id: 'deposit',
        account: 'closed',
        amount: 10_000,
        date: '2016-01-05',
      });
      await db.insertTransaction({
        id: 'withdrawal',
        account: 'closed',
        amount: -10_000,
        date: '2016-02-05',
      });
      const result = await prepare();
      expect(result.netWorth).toBe(10_000);
      await reloadCache();
    },
  );

  it('includes closed accounts when grouping custom reports by account', async () => {
    await db.insertWithSchema(
      'custom_reports',
      reportModel.fromJS({ ...customReport, groupBy: 'Account' }),
    );
    await addWidget({ type: 'custom-report', meta: { id: customReport.id } });
    await addExpense();
    await db.update('accounts', { id: 'checking', closed: 1 });
    expect((await prepare()).totalDebts).toBe(-20_000);
    await reloadCache();
  });

  it.each(['prepare', 'recompute'] as const)(
    'rebuilds saved custom report filters on %s',
    async refresh => {
      await db.insertWithSchema(
        'custom_reports',
        reportModel.fromJS(customReport),
      );
      await addWidget({ type: 'custom-report', meta: { id: customReport.id } });
      await addExpense();
      expect((await prepare()).totalDebts).toBe(-20_000);
      await db.updateWithSchema(
        'custom_reports',
        reportModel.fromJS({
          ...customReport,
          conditions: [{ field: 'amount', op: 'gt', type: 'number', value: 0 }],
        }),
      );
      if (refresh === 'prepare') {
        await reports.prepareDashboard({ dashboardPageId: 'page' });
      } else {
        await reports.recomputeWidget({ widgetId: 'widget' });
      }
      expect((await readReport()).totalDebts).toBe(0);
      await reloadCache();
    },
  );

  it('preloads budget reports after the budget spreadsheet is initialized', async () => {
    await addWidget({ type: 'budget-analysis-card', meta: { timeFrame } });
    await addExpense();
    await sheet.loadSpreadsheet(db);
    await budget.createAllBudgets();
    await sheet.waitOnSpreadsheet();
    await reports.loadReportSpreadsheetCache();
    expect((await readReport()).totalSpent).toBe(-20_000);
    await reloadCache();
  });

  it('refreshes budget-only formulas after spending and account changes', async () => {
    await addWidget({
      type: 'formula-card',
      meta: {
        formula:
          '=BUDGET_QUERY("spent", QUERY_EXTRACT_CATEGORIES("Expenses"), "2016-01", "2016-01")',
        queries: {
          Expenses: {
            conditions: [
              { field: 'category', op: 'is', type: 'id', value: 'groceries' },
            ],
          },
        },
      },
    });
    await addExpense();
    await sheet.loadSpreadsheet(db);
    await budget.createAllBudgets();
    expect(await prepare()).toEqual({ error: null, result: -200 });
    await reloadCache();
    await db.updateTransaction({ id: 'expense', amount: -25_000 });
    expect(await readReport()).toEqual({ error: null, result: -250 });
    await db.update('accounts', { id: 'checking', offbudget: 1 });
    expect(await readReport()).toEqual({ error: null, result: 0 });
  });

  it('refreshes budget-only formulas after a budget allocation changes', async () => {
    await addWidget({
      type: 'formula-card',
      meta: {
        formula:
          '=BUDGET_QUERY("budgeted", QUERY_EXTRACT_CATEGORIES("Expenses"), "2016-01", "2016-01")',
        queries: {
          Expenses: {
            conditions: [
              { field: 'category', op: 'is', type: 'id', value: 'groceries' },
            ],
          },
        },
      },
    });
    await addExpense();
    await sheet.loadSpreadsheet(db);
    await budget.createAllBudgets();
    await setBudget({ month, category: 'groceries', amount: 50_000 });
    expect(await prepare()).toEqual({ error: null, result: 500 });
    await setBudget({ month, category: 'groceries', amount: 60_000 });
    expect(await readReport()).toEqual({ error: null, result: 600 });
  });
});
