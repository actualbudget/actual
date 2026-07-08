import * as d from 'date-fns';

import type { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type {
  CalendarWidget,
  RuleConditionEntity,
  TimeFrame,
} from '#types/models';
import type { SyncedPrefs } from '#types/prefs';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type CalendarQueryRow = {
  amount?: number;
  date?: string;
};

const defaultTimeFrame = {
  start: monthUtils.dayFromDate(monthUtils.currentMonth()),
  end: monthUtils.currentDay(),
  mode: 'full',
} satisfies TimeFrame;

function conditionsToFilters(conditions?: RuleConditionEntity[]) {
  return conditionsToAQL((conditions ?? []).filter(cond => !cond.customName))
    .filters;
}

function makeCalendarQuery({
  amountOp,
  conditions,
  conditionsOp,
  endDay,
  startDay,
}: {
  amountOp: '$gt' | '$lt';
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or' | undefined;
  endDay: string;
  startDay: string;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

  return q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
    })
    .filter({
      $and: [{ date: { $gte: startDay } }, { date: { $lte: endDay } }],
      amount: { [amountOp]: 0 },
    })
    .groupBy(['date'])
    .select(['date', { amount: { $sum: '$amount' } }])
    .serialize();
}

function getOneDatePerMonth(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  let currentDate = d.startOfMonth(start);

  while (!d.isSameMonth(currentDate, end)) {
    months.push(currentDate);
    currentDate = d.addMonths(currentDate, 1);
  }
  months.push(end);

  return months;
}

function parseFirstDayOfWeek(
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'],
): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const parsed = parseInt(firstDayOfWeekIdx ?? '0');
  return !Number.isNaN(parsed) && parsed >= 0 && parsed <= 6
    ? (parsed as 0 | 1 | 2 | 3 | 4 | 5 | 6)
    : 0;
}

function calculateCalendarData({
  expenseData,
  firstDayOfWeekIdx,
  incomeData,
  months,
}: {
  expenseData: CalendarQueryRow[];
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  incomeData: CalendarQueryRow[];
  months: Date[];
}): JSONValue {
  const incomeDataMap = new Map<string, number>();
  for (const item of incomeData) {
    if (item.date) {
      incomeDataMap.set(item.date, item.amount ?? 0);
    }
  }

  const expenseDataMap = new Map<string, number>();
  for (const item of expenseData) {
    if (item.date) {
      expenseDataMap.set(item.date, item.amount ?? 0);
    }
  }

  const dateCache = new Map<string, Date>();
  function parseAndCacheDate(dateStr: string) {
    const cached = dateCache.get(dateStr);
    if (cached) {
      return cached;
    }
    const parsed = d.parse(dateStr, 'yyyy-MM-dd', new Date());
    dateCache.set(dateStr, parsed);
    return parsed;
  }

  function getDaysArray(month: Date) {
    const expenseValues = expenseData
      .filter(
        item => item.date && d.isSameMonth(parseAndCacheDate(item.date), month),
      )
      .map(item => Math.abs(item.amount ?? 0));
    const incomeValues = incomeData
      .filter(
        item => item.date && d.isSameMonth(parseAndCacheDate(item.date), month),
      )
      .map(item => Math.abs(item.amount ?? 0));

    const totalExpenseValue =
      expenseValues.length > 0
        ? expenseValues.reduce((sum, value) => sum + value, 0)
        : null;
    const totalIncomeValue =
      incomeValues.length > 0
        ? incomeValues.reduce((sum, value) => sum + value, 0)
        : null;

    function getBarLength(value: number) {
      if (
        value < 0 &&
        typeof totalExpenseValue === 'number' &&
        totalExpenseValue > 0
      ) {
        const result = (Math.abs(value) / totalExpenseValue) * 100;
        return Number.isFinite(result) ? result : 0;
      }
      if (
        value > 0 &&
        typeof totalIncomeValue === 'number' &&
        totalIncomeValue > 0
      ) {
        const result = (value / totalIncomeValue) * 100;
        return Number.isFinite(result) ? result : 0;
      }
      return 0;
    }

    const firstDay = d.startOfMonth(month);
    const beginDay = d.startOfWeek(firstDay, {
      weekStartsOn: parseFirstDayOfWeek(firstDayOfWeekIdx),
    });
    let totalDays =
      d.differenceInDays(firstDay, beginDay) + d.getDaysInMonth(firstDay);
    if (totalDays % 7 !== 0) {
      totalDays += 7 - (totalDays % 7);
    }

    const daysArray: Array<{
      date: string;
      expenseSize: number;
      expenseValue: number;
      incomeSize: number;
      incomeValue: number;
    }> = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = d.addDays(beginDay, i);

      if (!d.isSameMonth(currentDate, firstDay)) {
        daysArray.push({
          date: d.format(currentDate, 'yyyy-MM-dd'),
          expenseSize: 0,
          expenseValue: 0,
          incomeSize: 0,
          incomeValue: 0,
        });
      } else {
        const dateKey = d.format(currentDate, 'yyyy-MM-dd');
        const currentIncome = incomeDataMap.get(dateKey) ?? 0;
        const currentExpense = expenseDataMap.get(dateKey) ?? 0;

        daysArray.push({
          date: dateKey,
          expenseSize: getBarLength(currentExpense),
          expenseValue: Math.abs(currentExpense),
          incomeSize: getBarLength(currentIncome),
          incomeValue: Math.abs(currentIncome),
        });
      }
    }

    return {
      data: daysArray,
      totalExpense: totalExpenseValue ?? 0,
      totalIncome: totalIncomeValue ?? 0,
    };
  }

  return {
    calendarData: months.map(month => ({
      ...getDaysArray(month),
      end: d.format(d.endOfMonth(month), 'yyyy-MM-dd'),
      start: d.format(d.startOfMonth(month), 'yyyy-MM-dd'),
    })),
  };
}

export function createCalendarReportPlan({
  firstDayOfWeekIdx,
  latestTransactionDate,
  sheet,
  widget,
}: {
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  latestTransactionDate: string | null;
  sheet: Spreadsheet;
  widget: CalendarWidget;
}): ReportPlan {
  const meta = widget.meta;
  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    defaultTimeFrame,
    latestTransactionDate,
  );
  const startDay = monthUtils.firstDayOfMonth(start);
  const endDay = monthUtils.lastDayOfMonth(end);
  const startDate = d.parse(startDay, 'yyyy-MM-dd', new Date());
  const endDate = d.parse(endDay, 'yyyy-MM-dd', new Date());
  const months = getOneDatePerMonth(startDate, endDate);
  const planHash = hashString(
    stableStringify({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDay,
      firstDayOfWeekIdx,
      startDay,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const incomeCell = resolveName(sheetName, 'income-query');
  const expenseCell = resolveName(sheetName, 'expense-query');
  const queryCells = [incomeCell, expenseCell];

  sheet.createQuery(
    sheetName,
    'income-query',
    makeCalendarQuery({
      amountOp: '$gt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDay,
      startDay,
    }),
  );
  sheet.createQuery(
    sheetName,
    'expense-query',
    makeCalendarQuery({
      amountOp: '$lt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDay,
      startDay,
    }),
  );

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (income: JSONValue, expense: JSONValue) =>
      calculateCalendarData({
        expenseData: Array.isArray(expense)
          ? (expense as CalendarQueryRow[])
          : [],
        firstDayOfWeekIdx,
        incomeData: Array.isArray(income) ? (income as CalendarQueryRow[]) : [],
        months,
      }),
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
