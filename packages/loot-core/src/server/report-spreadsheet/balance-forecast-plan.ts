import { generateForecast } from '#server/forecast/app';
import { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { BalanceForecastWidget } from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

export function createBalanceForecastReportPlan({
  budgetType,
  sheet,
  widget,
}: {
  budgetType: 'envelope' | 'tracking';
  sheet: Spreadsheet;
  widget: BalanceForecastWidget;
}): ReportPlan {
  const meta = widget.meta;
  const defaultTimeFrame = {
    start: monthUtils.currentMonth(),
    end: monthUtils.addMonths(monthUtils.currentMonth(), 11),
    mode: 'static' as const,
  };
  const [start, end] = calculateTimeRange(meta?.timeFrame, defaultTimeFrame);
  const startDate = start + '-01';
  const endDate = monthUtils.lastDayOfMonth(end);
  const source =
    meta?.source === 'tracking-budget' && budgetType === 'tracking'
      ? 'tracking-budget'
      : 'schedules';
  const isTrackingBudgetForecast = source === 'tracking-budget';
  const planHash = hashString(
    stableStringify({
      budgetType,
      endDate,
      meta,
      source,
      startDate,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const queryCells = [
    resolveName(sheetName, 'accounts-dependency-query'),
    resolveName(sheetName, 'transactions-dependency-query'),
    resolveName(sheetName, 'schedules-dependency-query'),
    resolveName(sheetName, 'zero-budgets-dependency-query'),
    resolveName(sheetName, 'reflect-budgets-dependency-query'),
  ];

  sheet.createQuery(
    sheetName,
    'accounts-dependency-query',
    q('accounts').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'transactions-dependency-query',
    q('transactions').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'schedules-dependency-query',
    q('schedules').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'zero-budgets-dependency-query',
    q('zero_budgets').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'reflect-budgets-dependency-query',
    q('reflect_budgets').calculate({ $count: '*' }).serialize(),
  );
  sheet.createStatic(sheetName, 'data', null);

  return {
    compute: async (): Promise<JSONValue> => {
      try {
        return {
          error: null,
          forecastData: await generateForecast({
            accountIds: isTrackingBudgetForecast ? undefined : meta?.accounts,
            conditions: isTrackingBudgetForecast ? undefined : meta?.conditions,
            conditionsOp: isTrackingBudgetForecast
              ? undefined
              : meta?.conditionsOp,
            endDate,
            includeAccountlessSchedules: isTrackingBudgetForecast
              ? undefined
              : meta?.accounts === undefined,
            source,
            startDate,
          }),
        } as JSONValue;
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : 'Failed to load forecast',
          forecastData: null,
        };
      }
    },
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
