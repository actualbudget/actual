import * as d from 'date-fns';

import type { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type {
  AgeOfMoneyGranularity,
  AgeOfMoneyWidget,
  RuleConditionEntity,
} from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type Transaction = {
  amount: number;
  date: string;
  id: string;
};

type IncomeBucket = {
  date: string;
  remainingAmount: number;
};

function conditionsToFilters(conditions?: RuleConditionEntity[]) {
  return conditionsToAQL((conditions ?? []).filter(cond => !cond.customName))
    .filters;
}

function makeAgeOfMoneyQuery({
  amountOp,
  conditions,
  conditionsOp,
  endDate,
}: {
  amountOp: '$gt' | '$lt';
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or' | undefined;
  endDate: string;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

  return q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
    })
    .filter({
      $or: [
        { 'payee.transfer_acct': null },
        { 'payee.transfer_acct.offbudget': true },
      ],
      'account.offbudget': false,
      amount: { [amountOp]: 0 },
      date: { $lte: endDate },
    })
    .select(['id', 'date', 'amount'])
    .serialize();
}

function calculateAgeOfMoney(
  incomeTransactions: Transaction[],
  expenseTransactions: Transaction[],
) {
  const buckets: IncomeBucket[] = [...incomeTransactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(transaction => ({
      date: transaction.date,
      remainingAmount: transaction.amount,
    }));
  const sortedExpenses = [...expenseTransactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const ages: Array<{ age: number; date: string }> = [];
  let currentBucketIdx = 0;
  let insufficientData = false;

  for (const expense of sortedExpenses) {
    let remainingExpense = Math.abs(expense.amount);
    let lastBucketDate: string | null = null;

    while (remainingExpense > 0 && currentBucketIdx < buckets.length) {
      const bucket = buckets[currentBucketIdx];

      if (bucket.remainingAmount > 0) {
        const deduction = Math.min(bucket.remainingAmount, remainingExpense);
        bucket.remainingAmount -= deduction;
        remainingExpense -= deduction;
        lastBucketDate = bucket.date;
      }

      if (bucket.remainingAmount <= 0) {
        currentBucketIdx += 1;
      }
    }

    if (remainingExpense > 0) {
      insufficientData = true;
    }

    if (lastBucketDate) {
      const ageInDays = d.differenceInDays(
        d.parseISO(expense.date),
        d.parseISO(lastBucketDate),
      );
      ages.push({ age: Math.max(0, ageInDays), date: expense.date });
    }
  }

  return { ages, insufficientData };
}

function calculateAverageAge(
  ages: Array<{ age: number; date: string }>,
  count = 10,
): number | null {
  if (ages.length === 0) {
    return null;
  }

  const lastN = ages.slice(-count);
  return Math.round(
    lastN.reduce((sum, item) => sum + item.age, 0) / lastN.length,
  );
}

function getPeriodKey(date: string, granularity: AgeOfMoneyGranularity) {
  const parsed = d.parseISO(date);
  if (granularity === 'daily') {
    return date;
  }
  if (granularity === 'weekly') {
    return d.format(d.startOfWeek(parsed, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }
  return monthUtils.getMonth(date);
}

function formatPeriodLabel(
  periodKey: string,
  granularity: AgeOfMoneyGranularity,
) {
  if (granularity === 'daily' || granularity === 'weekly') {
    return d.format(d.parseISO(periodKey), 'MMM d, yyyy');
  }
  return d.format(d.parseISO(periodKey + '-01'), 'MMM yyyy');
}

function generatePeriods(
  startDate: string,
  endDate: string,
  granularity: AgeOfMoneyGranularity,
) {
  if (granularity === 'monthly') {
    return monthUtils.rangeInclusive(
      monthUtils.getMonth(startDate),
      monthUtils.getMonth(endDate),
    );
  }

  const periods: string[] = [];
  let current =
    granularity === 'weekly'
      ? d.startOfWeek(d.parseISO(startDate), { weekStartsOn: 1 })
      : d.parseISO(startDate);
  const end = d.parseISO(endDate);

  while (current <= end) {
    periods.push(d.format(current, 'yyyy-MM-dd'));
    current =
      granularity === 'weekly' ? d.addWeeks(current, 1) : d.addDays(current, 1);
  }

  return periods;
}

function calculateGraphData({
  ages,
  end,
  granularity,
  start,
}: {
  ages: Array<{ age: number; date: string }>;
  end: string;
  granularity: AgeOfMoneyGranularity;
  start: string;
}) {
  const startDate = monthUtils.firstDayOfMonth(start);
  let endDate = monthUtils.lastDayOfMonth(end);

  if (granularity === 'daily' || granularity === 'weekly') {
    const today = monthUtils.currentDay();
    if (monthUtils.isAfter(endDate, today)) {
      endDate = today;
    }
  }

  const periods = generatePeriods(startDate, endDate, granularity);
  const agesByPeriod: Record<string, number[]> = {};
  for (const { age, date } of ages) {
    const periodKey = getPeriodKey(date, granularity);
    agesByPeriod[periodKey] = [...(agesByPeriod[periodKey] ?? []), age];
  }

  let allAgesUpToPeriod: number[] = [];
  return periods.flatMap(period => {
    if (agesByPeriod[period]) {
      allAgesUpToPeriod = allAgesUpToPeriod.concat(agesByPeriod[period]);
    }

    if (allAgesUpToPeriod.length === 0) {
      return [];
    }

    const lastN = allAgesUpToPeriod.slice(-10);
    return [
      {
        ageOfMoney: Math.round(
          lastN.reduce((sum, age) => sum + age, 0) / lastN.length,
        ),
        date: formatPeriodLabel(period, granularity),
      },
    ];
  });
}

function calculateTrend(
  graphData: Array<{ ageOfMoney: number; date: string }>,
): 'down' | 'stable' | 'up' {
  if (graphData.length < 2) {
    return 'stable';
  }

  const last = graphData[graphData.length - 1].ageOfMoney;
  const secondLast = graphData[graphData.length - 2].ageOfMoney;
  const diff = last - secondLast;

  if (diff > 2) {
    return 'up';
  }
  if (diff < -2) {
    return 'down';
  }
  return 'stable';
}

function calculateAgeOfMoneyData({
  end,
  expenses,
  granularity,
  income,
  start,
}: {
  end: string;
  expenses: Transaction[];
  granularity: AgeOfMoneyGranularity;
  income: Transaction[];
  start: string;
}): JSONValue {
  const { ages, insufficientData } = calculateAgeOfMoney(income, expenses);
  const displayStart = monthUtils.firstDayOfMonth(start);
  const filteredAges = ages.filter(({ date }) => date >= displayStart);
  const graphData = calculateGraphData({
    ages: filteredAges,
    end,
    granularity,
    start,
  });

  return {
    currentAge: calculateAverageAge(filteredAges, 10),
    graphData,
    insufficientData,
    trend: calculateTrend(graphData),
  };
}

export function createAgeOfMoneyReportPlan({
  latestTransactionDate,
  sheet,
  widget,
}: {
  latestTransactionDate: string | null;
  sheet: Spreadsheet;
  widget: AgeOfMoneyWidget;
}): ReportPlan {
  const meta = widget.meta;
  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    undefined,
    latestTransactionDate,
  );
  const endDate = monthUtils.lastDayOfMonth(end);
  const today = monthUtils.currentDay();
  const fixedEnd = endDate > today ? today : endDate;
  const granularity = meta?.granularity ?? 'monthly';
  const planHash = hashString(
    stableStringify({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      fixedEnd,
      granularity,
      start,
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
    makeAgeOfMoneyQuery({
      amountOp: '$gt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate: fixedEnd,
    }),
  );
  sheet.createQuery(
    sheetName,
    'expense-query',
    makeAgeOfMoneyQuery({
      amountOp: '$lt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate: fixedEnd,
    }),
  );

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (income, expenses) =>
      calculateAgeOfMoneyData({
        end,
        expenses: Array.isArray(expenses) ? (expenses as Transaction[]) : [],
        granularity,
        income: Array.isArray(income) ? (income as Transaction[]) : [],
        start,
      }),
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
