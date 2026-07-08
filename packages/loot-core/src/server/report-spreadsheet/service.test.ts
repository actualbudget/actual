import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setBudget } from '#server/budget/actions';
import * as budget from '#server/budget/base';
import * as db from '#server/db';
import { reportModel } from '#server/reports/app';
import * as sheet from '#server/sheet';
import * as monthUtils from '#shared/months';
import type { JSONValue } from '#types/report-spreadsheet';

import * as reportSpreadsheet from './service';

const { emptyDatabase } = global as typeof globalThis & {
  emptyDatabase: () => () => Promise<void>;
};

function expectObjectValue(value: JSONValue, message: string) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  return value;
}

function expectSummaryValue(value: JSONValue, total: number): void {
  const reportData = expectObjectValue(value, 'Expected summary report data');

  expect(reportData.total).toBe(total);
  expect(reportData.dividend).toBe(total);
  expect(reportData.divisor).toBe(0);
}

function getSankeyLinkValue(
  value: JSONValue,
  from: string,
  to: string,
): number | undefined {
  const reportData = expectObjectValue(value, 'Expected sankey report data');
  const graph = reportData.graph;
  if (!Array.isArray(graph)) {
    throw new Error('Expected sankey graph');
  }

  const source = graph.find(entry => Array.isArray(entry) && entry[0] === from);
  if (!source || !Array.isArray(source)) {
    return undefined;
  }

  const node = source[1];
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    return undefined;
  }

  const links = node.to;
  if (!Array.isArray(links)) {
    return undefined;
  }

  const link = links.find(entry => Array.isArray(entry) && entry[0] === to);
  return Array.isArray(link) && typeof link[1] === 'number'
    ? link[1]
    : undefined;
}

describe('report spreadsheet service', () => {
  beforeEach(async () => {
    reportSpreadsheet.unloadReportSpreadsheet();
    await emptyDatabase()();
  });

  afterEach(async () => {
    reportSpreadsheet.unloadReportSpreadsheet();
    sheet.unloadSpreadsheet();
    await emptyDatabase()();
  });

  it('registers and refreshes a summary widget root cell after transaction changes', async () => {
    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'summary-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'summary-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        content: JSON.stringify({ type: 'sum' }),
        timeFrame: {
          start: monthUtils.currentMonth(),
          end: monthUtils.currentMonth(),
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'transaction',
      account: accountId,
      amount: 12_345,
      date: monthUtils.currentDay(),
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['summary-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared summary widget cell');
    }

    expect(preparedCell.name).toMatch(/^report:summary-widget:[a-z0-9]+!data$/);
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({ widgetId: 'summary-widget' });

    if (!cell) {
      throw new Error('Expected computed summary widget cell');
    }
    expectSummaryValue(cell.value, 12_345);

    await db.updateTransaction({
      id: 'transaction',
      amount: 20_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({ widgetId: 'summary-widget' });
    if (!cell) {
      throw new Error('Expected recomputed summary widget cell');
    }
    expectSummaryValue(cell.value, 20_000);
  });

  it('loads cached report cell values and clears them after database changes', async () => {
    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'summary-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'summary-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        content: JSON.stringify({ type: 'sum' }),
        timeFrame: {
          start: monthUtils.currentMonth(),
          end: monthUtils.currentMonth(),
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'transaction',
      account: accountId,
      amount: 12_345,
      date: monthUtils.currentDay(),
    });

    await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    reportSpreadsheet.unloadReportSpreadsheet();
    const cached = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });
    const cachedCell = cached.cells['summary-widget'];
    if (!cachedCell) {
      throw new Error('Expected cached summary widget cell');
    }
    expectSummaryValue(cachedCell.value, 12_345);

    reportSpreadsheet.unloadReportSpreadsheet();
    await db.updateTransaction({
      id: 'transaction',
      amount: 20_000,
    });

    const stale = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });
    const staleCell = stale.cells['summary-widget'];
    if (!staleCell) {
      throw new Error('Expected stale summary widget cell');
    }
    if (staleCell.value !== null) {
      expectSummaryValue(staleCell.value, 20_000);
    }

    await reportSpreadsheet.waitOnReportSpreadsheet();
    const refreshed = await reportSpreadsheet.getCell({
      widgetId: 'summary-widget',
    });
    if (!refreshed) {
      throw new Error('Expected refreshed summary widget cell');
    }
    expectSummaryValue(refreshed.value, 20_000);
  });

  it('prepares dashboards when loading an empty report cache', async () => {
    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'summary-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'summary-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        content: JSON.stringify({ type: 'sum' }),
        timeFrame: {
          start: monthUtils.currentMonth(),
          end: monthUtils.currentMonth(),
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'transaction',
      account: accountId,
      amount: 12_345,
      date: monthUtils.currentDay(),
    });

    await reportSpreadsheet.loadReportSpreadsheetCache();
    const cell = await reportSpreadsheet.getCell({
      widgetId: 'summary-widget',
    });

    if (!cell) {
      throw new Error('Expected prewarmed summary widget cell');
    }
    expectSummaryValue(cell.value, 12_345);
  });

  it('registers and refreshes a net worth widget root cell after transaction changes', async () => {
    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'net-worth-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'net-worth-card',
      width: 6,
      height: 3,
      x: 0,
      y: 0,
      meta: {
        timeFrame: {
          start: monthUtils.currentMonth(),
          end: monthUtils.currentMonth(),
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'transaction',
      account: accountId,
      amount: 12_345,
      date: monthUtils.currentDay(),
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['net-worth-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared net worth widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:net-worth-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'net-worth-widget',
    });

    if (!cell) {
      throw new Error('Expected computed net worth widget cell');
    }
    let value = expectObjectValue(
      cell.value,
      'Expected computed net worth widget cell',
    );
    expect(value.netWorth).toBe(12_345);
    expect(value.accounts).toEqual([{ id: accountId, name: 'Checking' }]);

    await db.updateTransaction({
      id: 'transaction',
      amount: 20_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({ widgetId: 'net-worth-widget' });
    if (!cell) {
      throw new Error('Expected recomputed net worth widget cell');
    }
    value = expectObjectValue(
      cell.value,
      'Expected recomputed net worth widget cell',
    );
    expect(value.netWorth).toBe(20_000);
  });

  it('registers and refreshes a cash flow widget root cell after transaction changes', async () => {
    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'cash-flow-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'cash-flow-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        timeFrame: {
          start: monthUtils.currentMonth(),
          end: monthUtils.currentMonth(),
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'income',
      account: accountId,
      amount: 20_000,
      date: monthUtils.currentDay(),
    });
    await db.insertTransaction({
      id: 'expense',
      account: accountId,
      amount: -8_000,
      date: monthUtils.currentDay(),
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['cash-flow-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared cash flow widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:cash-flow-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'cash-flow-widget',
    });

    if (!cell) {
      throw new Error('Expected computed cash flow widget cell');
    }
    let value = expectObjectValue(
      cell.value,
      'Expected computed cash flow widget cell',
    );
    expect(value.graphData).toEqual({
      expense: -8_000,
      income: 20_000,
    });

    await db.updateTransaction({
      id: 'expense',
      amount: -10_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({ widgetId: 'cash-flow-widget' });
    if (!cell) {
      throw new Error('Expected recomputed cash flow widget cell');
    }
    value = expectObjectValue(
      cell.value,
      'Expected recomputed cash flow widget cell',
    );
    expect(value.graphData).toEqual({
      expense: -10_000,
      income: 20_000,
    });
  });

  it('registers and refreshes a calendar widget root cell after transaction changes', async () => {
    const currentMonth = monthUtils.currentMonth();
    const currentDay = `${currentMonth}-01`;

    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'calendar-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'calendar-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        timeFrame: {
          start: currentMonth,
          end: currentMonth,
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'income',
      account: accountId,
      amount: 20_000,
      date: currentDay,
    });
    await db.insertTransaction({
      id: 'expense',
      account: accountId,
      amount: -8_000,
      date: currentDay,
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['calendar-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared calendar widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:calendar-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'calendar-widget',
    });

    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected computed calendar widget cell');
    }

    const value = cell.value as {
      calendarData?: Array<{
        data?: Array<Record<string, unknown>>;
        totalExpense?: number;
        totalIncome?: number;
      }>;
    };
    const calendar = value.calendarData?.[0];
    expect(calendar).toMatchObject({
      totalExpense: 8_000,
      totalIncome: 20_000,
    });
    expect(calendar?.data?.find(day => day.date === currentDay)).toMatchObject({
      date: currentDay,
      expenseValue: 8_000,
      incomeValue: 20_000,
    });

    await db.updateTransaction({
      id: 'expense',
      amount: -10_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({ widgetId: 'calendar-widget' });
    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected recomputed calendar widget cell');
    }

    const updatedValue = cell.value as {
      calendarData?: Array<{
        data?: Array<Record<string, unknown>>;
        totalExpense?: number;
        totalIncome?: number;
      }>;
    };
    const updatedCalendar = updatedValue.calendarData?.[0];
    expect(updatedCalendar).toMatchObject({
      totalExpense: 10_000,
      totalIncome: 20_000,
    });
    expect(
      updatedCalendar?.data?.find(day => day.date === currentDay),
    ).toMatchObject({
      date: currentDay,
      expenseValue: 10_000,
      incomeValue: 20_000,
    });
  });

  it('registers and refreshes a custom report widget root cell after transaction changes', async () => {
    const currentMonth = monthUtils.currentMonth();

    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema(
      'custom_reports',
      reportModel.fromJS({
        balanceType: 'Payment',
        conditions: [],
        conditionsOp: 'and',
        dateRange: 'Last 6 months',
        endDate: monthUtils.getMonthEnd(`${currentMonth}-01`),
        graphType: 'BarGraph',
        groupBy: 'Category',
        id: 'custom-report',
        includeCurrentInterval: true,
        interval: 'Monthly',
        isDateStatic: true,
        mode: 'total',
        name: 'Spending by category',
        showEmpty: false,
        showHiddenCategories: true,
        showOffBudget: false,
        showTrendLines: false,
        showUncategorized: true,
        sortBy: 'desc',
        startDate: `${currentMonth}-01`,
        trimIntervals: false,
      }),
    );
    await db.insertWithSchema('dashboard', {
      id: 'custom-report-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'custom-report',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: { id: 'custom-report' },
    });
    await db.insertCategoryGroup({
      id: 'expense-group',
      is_income: 0,
      name: 'Expenses',
    });
    await db.insertCategory({
      id: 'groceries',
      cat_group: 'expense-group',
      is_income: 0,
      name: 'Groceries',
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'expense',
      account: accountId,
      amount: -8_000,
      category: 'groceries',
      date: `${currentMonth}-01`,
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['custom-report-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared custom report widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:custom-report-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'custom-report-widget',
    });

    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected computed custom report widget cell');
    }

    const value = cell.value as {
      data?: Array<Record<string, unknown>>;
      intervalData?: Array<Record<string, unknown>>;
      intervalsCount?: number;
      totalDebts?: number;
      totalTotals?: number;
    };
    expect(value.intervalsCount).toBe(1);
    expect(value.totalDebts).toBe(-8_000);
    expect(value.totalTotals).toBe(-8_000);
    expect(value.data?.[0]).toMatchObject({
      id: 'groceries',
      totalDebts: -8_000,
      totalTotals: -8_000,
    });
    expect(value.intervalData?.[0]).toMatchObject({
      totalDebts: -8_000,
      totalTotals: -8_000,
    });

    await db.updateTransaction({
      id: 'expense',
      amount: -10_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({
      widgetId: 'custom-report-widget',
    });
    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected recomputed custom report widget cell');
    }

    const updatedValue = cell.value as {
      data?: Array<Record<string, unknown>>;
      intervalData?: Array<Record<string, unknown>>;
      totalDebts?: number;
      totalTotals?: number;
    };
    expect(updatedValue.totalDebts).toBe(-10_000);
    expect(updatedValue.totalTotals).toBe(-10_000);
    expect(updatedValue.data?.[0]).toMatchObject({
      id: 'groceries',
      totalDebts: -10_000,
      totalTotals: -10_000,
    });
    expect(updatedValue.intervalData?.[0]).toMatchObject({
      totalDebts: -10_000,
      totalTotals: -10_000,
    });
  });

  it('registers and refreshes a formula widget root cell after transaction changes', async () => {
    const currentMonth = monthUtils.currentMonth();

    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'formula-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'formula-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        formula: '=QUERY("Groceries")',
        queries: {
          Groceries: {
            conditions: [
              {
                field: 'category',
                op: 'is',
                type: 'id',
                value: 'groceries',
              },
            ],
            conditionsOp: 'and',
            timeFrame: {
              start: currentMonth,
              end: currentMonth,
              mode: 'static',
            },
          },
        },
      },
    });
    await db.insertCategoryGroup({
      id: 'expense-group',
      is_income: 0,
      name: 'Expenses',
    });
    await db.insertCategory({
      id: 'groceries',
      cat_group: 'expense-group',
      is_income: 0,
      name: 'Groceries',
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'expense',
      account: accountId,
      amount: -20_000,
      category: 'groceries',
      date: `${currentMonth}-01`,
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['formula-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared formula widget cell');
    }

    expect(preparedCell.name).toMatch(/^report:formula-widget:[a-z0-9]+!data$/);
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({ widgetId: 'formula-widget' });

    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected computed formula widget cell');
    }
    expect(cell.value).toEqual({ error: null, result: -200 });

    await db.updateTransaction({
      id: 'expense',
      amount: -25_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({ widgetId: 'formula-widget' });
    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected recomputed formula widget cell');
    }
    expect(cell.value).toEqual({ error: null, result: -250 });
  });

  it('registers and refreshes a spending widget root cell after transaction changes', async () => {
    const currentMonth = monthUtils.currentMonth();
    const previousMonth = monthUtils.subMonths(currentMonth, 1);

    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'spending-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'spending-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        compare: currentMonth,
        compareTo: previousMonth,
        mode: 'single-month',
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'current-expense',
      account: accountId,
      amount: -10_000,
      date: `${currentMonth}-01`,
    });
    await db.insertTransaction({
      id: 'previous-expense',
      account: accountId,
      amount: -7_000,
      date: `${previousMonth}-01`,
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['spending-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared spending widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:spending-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'spending-widget',
    });

    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected computed spending widget cell');
    }

    const value = cell.value as {
      intervalData?: Array<Record<string, unknown>>;
    };
    expect(value.intervalData?.[0].compare).toBe(-10_000);
    expect(value.intervalData?.[0].compareTo).toBe(-7_000);

    await db.updateTransaction({
      id: 'current-expense',
      amount: -12_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({ widgetId: 'spending-widget' });
    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected recomputed spending widget cell');
    }

    const updatedValue = cell.value as {
      intervalData?: Array<Record<string, unknown>>;
    };
    expect(updatedValue.intervalData?.[0].compare).toBe(-12_000);
    expect(updatedValue.intervalData?.[0].compareTo).toBe(-7_000);
  });

  it('registers and refreshes a budget analysis widget root cell after transaction changes', async () => {
    const currentMonth = monthUtils.currentMonth();

    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'budget-analysis-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'budget-analysis-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        timeFrame: {
          start: currentMonth,
          end: currentMonth,
          mode: 'static',
        },
      },
    });
    await db.insertCategoryGroup({
      id: 'expense-group',
      is_income: 0,
      name: 'Expenses',
    });
    await db.insertCategory({
      id: 'groceries',
      cat_group: 'expense-group',
      is_income: 0,
      name: 'Groceries',
    });
    await db.insertCategoryGroup({
      id: 'income-group',
      is_income: 1,
      name: 'Income',
    });
    await db.insertCategory({
      id: 'income',
      cat_group: 'income-group',
      is_income: 1,
      name: 'Income',
    });
    await sheet.loadSpreadsheet(db);
    await budget.createBudget([currentMonth]);
    await setBudget({
      amount: 50_000,
      category: 'groceries',
      month: currentMonth,
    });
    await sheet.waitOnSpreadsheet();

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'expense',
      account: accountId,
      amount: -20_000,
      category: 'groceries',
      date: `${currentMonth}-01`,
    });
    await sheet.waitOnSpreadsheet();

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['budget-analysis-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared budget analysis widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:budget-analysis-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'budget-analysis-widget',
    });

    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected computed budget analysis widget cell');
    }

    const value = cell.value as {
      intervalData?: Array<Record<string, unknown>>;
    };
    expect(value.intervalData?.at(-1)).toMatchObject({
      balance: 30_000,
      budgeted: 50_000,
      spent: -20_000,
    });

    await db.updateTransaction({
      id: 'expense',
      amount: -25_000,
    });
    await sheet.waitOnSpreadsheet();
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({
      widgetId: 'budget-analysis-widget',
    });
    if (!cell || cell.value === null || typeof cell.value !== 'object') {
      throw new Error('Expected recomputed budget analysis widget cell');
    }

    const updatedValue = cell.value as {
      intervalData?: Array<Record<string, unknown>>;
    };
    expect(updatedValue.intervalData?.at(-1)).toMatchObject({
      balance: 25_000,
      budgeted: 50_000,
      spent: -25_000,
    });
  });

  it('registers and refreshes an age of money widget root cell after transaction changes', async () => {
    const previousMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);

    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'age-of-money-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'age-of-money-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        granularity: 'monthly',
        timeFrame: {
          start: previousMonth,
          end: previousMonth,
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'income',
      account: accountId,
      amount: 20_000,
      date: `${previousMonth}-01`,
    });
    await db.insertTransaction({
      id: 'expense',
      account: accountId,
      amount: -8_000,
      date: `${previousMonth}-11`,
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['age-of-money-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared age of money widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:age-of-money-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'age-of-money-widget',
    });

    if (!cell) {
      throw new Error('Expected computed age of money widget cell');
    }
    let value = expectObjectValue(
      cell.value,
      'Expected computed age of money widget cell',
    );
    expect(value.currentAge).toBe(10);
    expect(value.graphData).toEqual([
      {
        ageOfMoney: 10,
        date: expect.any(String),
      },
    ]);
    expect(value.insufficientData).toBe(false);

    await db.updateTransaction({
      id: 'expense',
      date: `${previousMonth}-21`,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({
      widgetId: 'age-of-money-widget',
    });
    if (!cell) {
      throw new Error('Expected recomputed age of money widget cell');
    }
    value = expectObjectValue(
      cell.value,
      'Expected recomputed age of money widget cell',
    );
    expect(value.currentAge).toBe(20);
  });

  it('registers and refreshes a balance forecast widget root cell after transaction changes', async () => {
    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'balance-forecast-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'balance-forecast-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        timeFrame: {
          start: '2024-01',
          end: '2024-01',
          mode: 'static',
        },
      },
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'deposit',
      account: accountId,
      amount: 12_345,
      date: '2024-01-05',
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['balance-forecast-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared balance forecast widget cell');
    }

    expect(preparedCell.name).toMatch(
      /^report:balance-forecast-widget:[a-z0-9]+!data$/,
    );
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({
      widgetId: 'balance-forecast-widget',
    });

    if (!cell) {
      throw new Error('Expected computed balance forecast widget cell');
    }
    let value = expectObjectValue(
      cell.value,
      'Expected computed balance forecast widget cell',
    );
    expect(value.error).toBeNull();
    expect(
      (
        value.forecastData as {
          dataPoints: Array<{ balance: number; date: string }>;
        }
      ).dataPoints.find(point => point.date === '2024-01-05')?.balance,
    ).toBe(12_345);

    await db.updateTransaction({
      id: 'deposit',
      amount: 20_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({
      widgetId: 'balance-forecast-widget',
    });
    if (!cell) {
      throw new Error('Expected recomputed balance forecast widget cell');
    }
    value = expectObjectValue(
      cell.value,
      'Expected recomputed balance forecast widget cell',
    );
    expect(
      (
        value.forecastData as {
          dataPoints: Array<{ balance: number; date: string }>;
        }
      ).dataPoints.find(point => point.date === '2024-01-05')?.balance,
    ).toBe(20_000);
  });

  it('registers and refreshes a sankey widget root cell after transaction changes', async () => {
    await db.insertWithSchema('dashboard_pages', {
      id: 'dashboard-page',
      name: 'Dashboard',
    });
    await db.insertWithSchema('dashboard', {
      id: 'sankey-widget',
      dashboard_page_id: 'dashboard-page',
      type: 'sankey-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        mode: 'spent',
        timeFrame: {
          start: '2024-01',
          end: '2024-01',
          mode: 'static',
        },
      },
    });
    await db.insertCategoryGroup({
      id: 'expense-group',
      is_income: 0,
      name: 'Expenses',
    });
    await db.insertCategory({
      id: 'groceries',
      cat_group: 'expense-group',
      is_income: 0,
      name: 'Groceries',
    });

    const accountId = await db.insertAccount({
      id: 'checking',
      name: 'Checking',
    });
    await db.insertTransaction({
      id: 'expense',
      account: accountId,
      amount: -8_000,
      category: 'groceries',
      date: '2024-01-01',
    });

    const prepared = await reportSpreadsheet.prepareDashboard({
      dashboardPageId: 'dashboard-page',
    });

    const preparedCell = prepared.cells['sankey-widget'];
    if (!preparedCell) {
      throw new Error('Expected prepared sankey widget cell');
    }

    expect(preparedCell.name).toMatch(/^report:sankey-widget:[a-z0-9]+!data$/);
    expect(preparedCell.value).toBeNull();

    await reportSpreadsheet.waitOnReportSpreadsheet();
    let cell = await reportSpreadsheet.getCell({ widgetId: 'sankey-widget' });

    if (!cell) {
      throw new Error('Expected computed sankey widget cell');
    }
    expect(getSankeyLinkValue(cell.value, accountId, 'expense-group')).toBe(
      8_000,
    );
    expect(getSankeyLinkValue(cell.value, 'expense-group', 'groceries')).toBe(
      8_000,
    );

    await db.updateTransaction({
      id: 'expense',
      amount: -10_000,
    });
    await reportSpreadsheet.waitOnReportSpreadsheet();

    cell = await reportSpreadsheet.getCell({ widgetId: 'sankey-widget' });
    if (!cell) {
      throw new Error('Expected recomputed sankey widget cell');
    }
    expect(getSankeyLinkValue(cell.value, accountId, 'expense-group')).toBe(
      10_000,
    );
    expect(getSankeyLinkValue(cell.value, 'expense-group', 'groceries')).toBe(
      10_000,
    );
  });
});
