import * as connection from '#platform/server/connection';
import { logger } from '#platform/server/log';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { reportModel } from '#server/reports/app';
import { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { q } from '#shared/query';
import type {
  CustomReportData,
  CustomReportEntity,
  DashboardPageEntity,
  DashboardWidgetEntity,
} from '#types/models';
import type {
  ReportSpreadsheetCell,
  ReportSpreadsheetValues,
} from '#types/report-spreadsheet';

import { createAgeOfMoneyReportPlan } from './age-of-money-plan';
import { createBalanceForecastReportPlan } from './balance-forecast-plan';
import { createBudgetAnalysisReportPlan } from './budget-analysis-plan';
import { createCalendarReportPlan } from './calendar-plan';
import { createCashFlowReportPlan } from './cash-flow-plan';
import { createCustomReportPlan } from './custom-report-plan';
import { createFormulaReportPlan } from './formula-plan';
import { createNetWorthReportPlan } from './net-worth-plan';
import { createSankeyReportPlan } from './sankey-plan';
import { createSpendingReportPlan } from './spending-plan';
import { createSummaryReportPlan } from './summary-plan';
import type { DataMap, ReportPlan } from './types';

type ReportContext = {
  budgetType: 'envelope' | 'tracking';
  earliestTransactionDate: string | null;
  firstDayOfWeekIdx: string;
  latestTransactionDate: string | null;
};

let reportSheet = createReportSheet();
const activePlans = new Map<DashboardWidgetEntity['id'], ReportPlan>();
const rootCells = new Map<string, ReportPlan>();
const pendingComputes = new Set<Promise<void>>();

function runPlanCompute(plan: ReportPlan): void {
  if (!plan.compute) {
    return;
  }

  const promise = Promise.resolve(plan.compute())
    .then(value => {
      if (activePlans.get(plan.widgetId) === plan) {
        reportSheet.set(plan.rootName, value);
      }
    })
    .catch(error => {
      logger.warn(`Failed running report compute ${plan.rootName}!`, error);
    })
    .finally(() => {
      pendingComputes.delete(promise);
    });

  pendingComputes.add(promise);
}

function createReportSheet() {
  const spreadsheet = new Spreadsheet();
  spreadsheet.addEventListener('change', ({ names }: { names: string[] }) => {
    const changedNames = new Set(names);
    for (const plan of activePlans.values()) {
      if (
        plan.compute &&
        plan.queryCells.some(queryCell => changedNames.has(queryCell))
      ) {
        runPlanCompute(plan);
      }
    }

    const cells = names.flatMap(name => {
      const plan = rootCells.get(name);
      if (!plan) {
        return [];
      }

      return [
        {
          widgetId: plan.widgetId,
          name,
          value: reportSheet.getNode(name).value,
        } satisfies ReportSpreadsheetCell,
      ];
    });

    if (cells.length > 0) {
      connection.send('report-cells-changed', cells);
    }
  });
  return spreadsheet;
}

export function unloadReportSpreadsheet(): void {
  reportSheet.unload();
  activePlans.clear();
  rootCells.clear();
  pendingComputes.clear();
  reportSheet = createReportSheet();
}

function waitOnReportSheet(): Promise<void> {
  return new Promise(resolve => {
    reportSheet.onFinish(resolve);
  });
}

export async function waitOnReportSpreadsheet(): Promise<void> {
  await waitOnReportSheet();

  while (pendingComputes.size > 0) {
    await Promise.all([...pendingComputes]);
    await waitOnReportSheet();
  }
}

async function getLatestTransactionDate(): Promise<string | null> {
  const transactions = await db.selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE date IS NOT NULL ORDER BY date DESC LIMIT 1',
    [],
  );
  return transactions[0]?.date ?? null;
}

async function getEarliestTransactionDate(): Promise<string | null> {
  const transactions = await db.selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE date IS NOT NULL ORDER BY date ASC LIMIT 1',
    [],
  );
  return transactions[0]?.date ?? null;
}

async function getFirstDayOfWeekIdx(): Promise<string> {
  const row = await db.first<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    ['firstDayOfWeekIdx'],
  );
  return row?.value || '0';
}

async function getBudgetType(): Promise<'envelope' | 'tracking'> {
  const row = await db.first<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    ['budgetType'],
  );
  return row?.value === 'tracking' ? 'tracking' : 'envelope';
}

async function getReportContext(): Promise<ReportContext> {
  const [
    budgetType,
    earliestTransactionDate,
    firstDayOfWeekIdx,
    latestTransactionDate,
  ] = await Promise.all([
    getBudgetType(),
    getEarliestTransactionDate(),
    getFirstDayOfWeekIdx(),
    getLatestTransactionDate(),
  ]);

  return {
    budgetType,
    earliestTransactionDate,
    firstDayOfWeekIdx,
    latestTransactionDate,
  };
}

function readPlan(plan: ReportPlan): ReportSpreadsheetCell {
  return {
    widgetId: plan.widgetId,
    name: plan.rootName,
    value: reportSheet.getNode(plan.rootName).value,
  };
}

function queueWidgetRecompute(plan: ReportPlan): void {
  if (plan.compute && plan.queryCells.length === 0) {
    runPlanCompute(plan);
    return;
  }

  const cells = plan.queryCells.length > 0 ? plan.queryCells : [plan.rootName];
  for (const name of cells) {
    reportSheet.recompute(name);
  }
}

function registerPlan(plan: ReportPlan): ReportSpreadsheetCell {
  const previous = activePlans.get(plan.widgetId);
  if (previous) {
    rootCells.delete(previous.rootName);
  }
  activePlans.set(plan.widgetId, plan);
  rootCells.set(plan.rootName, plan);
  queueWidgetRecompute(plan);

  return readPlan(plan);
}

async function getWidget(widgetId: DashboardWidgetEntity['id']) {
  const { data } = await aqlQuery(
    q('dashboard').filter({ id: widgetId }).select('*').limit(1),
  );
  return (data[0] as DashboardWidgetEntity | undefined) ?? null;
}

async function getCustomReport(
  reportId: CustomReportEntity['id'],
): Promise<CustomReportEntity | null> {
  const { data } = await aqlQuery(
    q('custom_reports').filter({ id: reportId }).select('*').limit(1),
  );
  const row = data[0] as CustomReportData | undefined;
  return row ? reportModel.toJS(row) : null;
}

async function registerWidget(
  widget: DashboardWidgetEntity,
  context: ReportContext,
): Promise<ReportSpreadsheetCell | null> {
  if (widget.type === 'age-of-money-card') {
    return registerPlan(
      createAgeOfMoneyReportPlan({
        latestTransactionDate: context.latestTransactionDate,
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'balance-forecast-card') {
    return registerPlan(
      createBalanceForecastReportPlan({
        budgetType: context.budgetType,
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'budget-analysis-card') {
    return registerPlan(
      createBudgetAnalysisReportPlan({
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'calendar-card') {
    return registerPlan(
      createCalendarReportPlan({
        firstDayOfWeekIdx: context.firstDayOfWeekIdx,
        latestTransactionDate: context.latestTransactionDate,
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'cash-flow-card') {
    return registerPlan(
      createCashFlowReportPlan({
        latestTransactionDate: context.latestTransactionDate,
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'custom-report') {
    const report = await getCustomReport(widget.meta.id);
    if (!report) {
      return null;
    }

    return registerPlan(
      createCustomReportPlan({
        budgetType: context.budgetType,
        earliestTransactionDate: context.earliestTransactionDate,
        firstDayOfWeekIdx: context.firstDayOfWeekIdx,
        latestTransactionDate: context.latestTransactionDate,
        report,
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'formula-card') {
    return registerPlan(
      createFormulaReportPlan({
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'net-worth-card') {
    return registerPlan(
      createNetWorthReportPlan({
        earliestTransactionDate: context.earliestTransactionDate,
        firstDayOfWeekIdx: context.firstDayOfWeekIdx,
        latestTransactionDate: context.latestTransactionDate,
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'sankey-card') {
    return registerPlan(
      createSankeyReportPlan({
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'summary-card') {
    return registerPlan(
      createSummaryReportPlan({
        latestTransactionDate: context.latestTransactionDate,
        sheet: reportSheet,
        widget,
      }),
    );
  }

  if (widget.type === 'spending-card') {
    return registerPlan(
      createSpendingReportPlan({
        budgetType: context.budgetType,
        earliestTransactionDate: context.earliestTransactionDate,
        sheet: reportSheet,
        widget,
      }),
    );
  }
  return null;
}

export async function prepareDashboard({
  dashboardPageId,
}: {
  dashboardPageId: DashboardPageEntity['id'];
}): Promise<{ cells: ReportSpreadsheetValues }> {
  const { data } = await aqlQuery(
    q('dashboard')
      .filter({ dashboard_page_id: dashboardPageId })
      .select('*')
      .orderBy('y')
      .orderBy('x'),
  );
  const context = await getReportContext();
  const cells: ReportSpreadsheetValues = {};

  for (const widget of data as DashboardWidgetEntity[]) {
    const cell = await registerWidget(widget, context);
    if (cell) {
      cells[widget.id] = cell;
    }
  }

  return { cells };
}

export async function getCell({
  widgetId,
}: {
  widgetId: DashboardWidgetEntity['id'];
}): Promise<ReportSpreadsheetCell | null> {
  const plan = activePlans.get(widgetId);
  return plan ? readPlan(plan) : null;
}

export async function recomputeWidget({
  widgetId,
}: {
  widgetId: DashboardWidgetEntity['id'];
}): Promise<ReportSpreadsheetCell | null> {
  let plan = activePlans.get(widgetId);
  if (!plan) {
    const widget = await getWidget(widgetId);
    if (widget) {
      const cell = await registerWidget(widget, await getReportContext());
      plan = cell ? activePlans.get(widgetId) : undefined;
    }
  }

  if (!plan) {
    return null;
  }

  queueWidgetRecompute(plan);
  return readPlan(plan);
}

export function triggerDatabaseChanges(oldValues: DataMap, newValues: DataMap) {
  if (activePlans.size === 0) {
    return;
  }
  reportSheet.triggerDatabaseChanges(oldValues, newValues);
}
