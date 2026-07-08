import * as d from 'date-fns';

import { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { QueryState } from '#shared/query';
import type {
  RuleConditionEntity,
  SummaryContent,
  SummaryWidget,
} from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type SummaryQueryRow = {
  amount?: number;
  count?: number;
  date?: string;
};

function getSummaryContent(meta: SummaryWidget['meta']): SummaryContent {
  if (!meta?.content) {
    return { type: 'sum' };
  }

  try {
    return JSON.parse(meta.content) as SummaryContent;
  } catch {
    return { type: 'sum' };
  }
}

function conditionsToFilters(conditions?: RuleConditionEntity[]) {
  return conditionsToAQL((conditions ?? []).filter(cond => !cond.customName))
    .filters;
}

function makeSummaryQuery({
  conditions,
  conditionsOp,
  content,
  endDay,
  startDay,
}: {
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or' | undefined;
  content: SummaryContent;
  endDay: Date;
  startDay: Date;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  let query = q('transactions')
    .filter({
      $and: [
        { date: { $gte: d.format(startDay, 'yyyy-MM-dd') } },
        { date: { $lte: d.format(endDay, 'yyyy-MM-dd') } },
      ],
    })
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
    })
    .select([
      'date',
      { amount: { $sum: '$amount' } },
      { count: { $count: '*' } },
    ]);

  if (content.type === 'avgPerMonth' || content.type === 'avgPerYear') {
    query = query.groupBy(['date']);
  }

  return query.serialize();
}

function makeDivisorQuery({
  content,
  endDay,
  startDay,
}: {
  content: SummaryContent;
  endDay: Date;
  startDay: Date;
}): QueryState | null {
  if (content.type !== 'percentage') {
    return null;
  }

  const conditionsOpKey = content.divisorConditionsOp === 'or' ? '$or' : '$and';
  let query = q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(content.divisorConditions),
    })
    .select([{ amount: { $sum: '$amount' } }]);

  if (!(content.divisorAllTimeDateRange ?? false)) {
    query = query.filter({
      $and: [
        { date: { $gte: d.format(startDay, 'yyyy-MM-dd') } },
        { date: { $lte: d.format(endDay, 'yyyy-MM-dd') } },
      ],
    });
  }

  return query.serialize();
}

function getOneDatePerMonth(start: Date, end: Date) {
  const months = [];
  let currentDate = d.startOfMonth(start);

  while (!d.isSameMonth(currentDate, end)) {
    months.push(currentDate);
    currentDate = d.addMonths(currentDate, 1);
  }
  months.push(end);

  return months;
}

function calculatePerMonth(data: SummaryQueryRow[], months: Date[]) {
  if (!data.length || !months.length) {
    return { total: 0, dividend: 0, divisor: 0 };
  }

  const monthlyData = data.reduce<Record<string, number>>((acc, day) => {
    if (!day.date) {
      return acc;
    }
    const monthKey = d.format(
      d.parse(day.date, 'yyyy-MM-dd', new Date()),
      'yyyy-MM',
    );
    acc[monthKey] = (acc[monthKey] || 0) + (day.amount ?? 0);
    return acc;
  }, {});

  const totalAmount = months
    .map(m => monthlyData[d.format(m, 'yyyy-MM')] || 0)
    .reduce((sum, amount) => sum + amount, 0);
  const lastMonth = months.at(-1)!;
  const dayOfMonth = lastMonth.getDate();
  const daysInMonth = monthUtils.getDay(monthUtils.lastDayOfMonth(lastMonth));
  const numMonths = months.length - 1 + dayOfMonth / daysInMonth;

  return {
    total: totalAmount / numMonths,
    dividend: totalAmount,
    divisor: numMonths,
  };
}

function calculatePerYear(
  data: SummaryQueryRow[],
  startDate: Date,
  endDate: Date,
) {
  if (!data.length) {
    return { total: 0, dividend: 0, divisor: 0 };
  }

  const totalAmount = data.reduce((sum, day) => sum + (day.amount ?? 0), 0);
  const totalDays = d.differenceInDays(endDate, startDate) + 1;
  const numYears = totalDays / 365.25;

  return {
    total: totalAmount / numYears,
    dividend: totalAmount,
    divisor: numYears,
  };
}

function calculatePercentage(
  data: SummaryQueryRow[],
  divisorRows: SummaryQueryRow[],
) {
  const divisorValue = divisorRows[0]?.amount ?? 0;
  const dividend = data.reduce((prev, ac) => prev + (ac.amount ?? 0), 0);
  return {
    total: Math.round((dividend / (divisorValue || 1)) * 10000) / 100,
    divisor: divisorValue,
    dividend,
  };
}

function calculateSummaryData({
  content,
  data,
  divisorRows,
  endDay,
  startDay,
}: {
  content: SummaryContent;
  data: SummaryQueryRow[];
  divisorRows: SummaryQueryRow[];
  endDay: Date;
  startDay: Date;
}): JSONValue {
  const dateRanges = {
    fromRange: d.format(startDay, 'MMM yy'),
    toRange: d.format(endDay, 'MMM yy'),
  };

  switch (content.type) {
    case 'sum':
      return {
        ...dateRanges,
        total: data[0]?.amount ?? 0,
        dividend: data[0]?.amount ?? 0,
        divisor: 0,
      };

    case 'avgPerTransact':
      return {
        ...dateRanges,
        total: data[0]?.count ? (data[0]?.amount ?? 0) / data[0].count : 0,
        dividend: data[0]?.amount ?? 0,
        divisor: data[0]?.count ?? 0,
      };

    case 'avgPerMonth':
      return {
        ...dateRanges,
        ...calculatePerMonth(data, getOneDatePerMonth(startDay, endDay)),
      };

    case 'avgPerYear':
      return {
        ...dateRanges,
        ...calculatePerYear(data, startDay, endDay),
      };

    case 'percentage':
      return {
        ...dateRanges,
        ...calculatePercentage(data, divisorRows),
      };

    default:
      return { ...dateRanges, total: 0, dividend: 0, divisor: 0 };
  }
}

export function createSummaryReportPlan({
  latestTransactionDate,
  sheet,
  widget,
}: {
  latestTransactionDate: string | null;
  sheet: Spreadsheet;
  widget: SummaryWidget;
}): ReportPlan {
  const meta = widget.meta;
  const content = getSummaryContent(meta);
  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    {
      start: monthUtils.dayFromDate(monthUtils.currentMonth()),
      end: monthUtils.currentDay(),
      mode: 'full',
    },
    latestTransactionDate,
  );
  const startDay = d.parse(
    monthUtils.firstDayOfMonth(start),
    'yyyy-MM-dd',
    new Date(),
  );
  const endDay = d.parse(
    monthUtils.getMonth(end) === monthUtils.getMonth(monthUtils.currentDay())
      ? monthUtils.currentDay()
      : monthUtils.lastDayOfMonth(end),
    'yyyy-MM-dd',
    new Date(),
  );
  const planHash = hashString(
    stableStringify({
      content,
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      end,
      start,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const queryCells = [resolveName(sheetName, 'summary-query')];
  const divisorQuery = makeDivisorQuery({ content, endDay, startDay });

  sheet.createQuery(
    sheetName,
    'summary-query',
    makeSummaryQuery({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      content,
      endDay,
      startDay,
    }),
  );

  if (divisorQuery) {
    queryCells.push(resolveName(sheetName, 'divisor-query'));
    sheet.createQuery(sheetName, 'divisor-query', divisorQuery);
  }

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (...values: unknown[]) =>
      calculateSummaryData({
        content,
        data: Array.isArray(values[0]) ? (values[0] as SummaryQueryRow[]) : [],
        divisorRows: Array.isArray(values[1])
          ? (values[1] as SummaryQueryRow[])
          : [],
        endDay,
        startDay,
      }),
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
