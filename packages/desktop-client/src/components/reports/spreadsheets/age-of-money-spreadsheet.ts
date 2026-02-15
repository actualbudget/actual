import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  type AgeOfMoneyGranularity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { runAll } from '@desktop-client/components/reports/util';
import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';

export type AgeOfMoneyData = {
  graphData: Array<{
    date: string; // Month label (e.g., "Jan 2024")
    ageOfMoney: number; // Days
  }>;
  currentAge: number | null; // Current AoM in days, null if no data
  trend: 'up' | 'down' | 'stable';
  insufficientData: boolean; // True if not enough income to cover expenses
};

type IncomeBucket = {
  date: string;
  remainingAmount: number;
};

export type Transaction = {
  id: string;
  date: string;
  amount: number;
};

export type TransactionWithCategory = Transaction & {
  categoryIsIncome: boolean | null;
};

/**
 * Classify transactions into income and expenses based on amount sign.
 * Income = positive amounts (including refunds - money entering your pool)
 * Expenses = negative amounts
 *
 * Note: We use amount-based classification for Age of Money because
 * refunds (positive amounts without income category) should still add
 * to the money pool. The categoryIsIncome field is preserved for
 * potential future use but not used for this classification.
 */
export function classifyTransactions(transactions: TransactionWithCategory[]): {
  income: Transaction[];
  expenses: Transaction[];
} {
  const income: Transaction[] = [];
  const expenses: Transaction[] = [];

  for (const t of transactions) {
    if (t.amount > 0) {
      income.push({ id: t.id, date: t.date, amount: t.amount });
    } else {
      expenses.push({ id: t.id, date: t.date, amount: t.amount });
    }
  }

  return { income, expenses };
}

/**
 * Calculate the age of money for a given set of expense transactions
 * using the FIFO (First In, First Out) method.
 *
 * Income becomes "buckets" sorted by date. When money is spent,
 * it's deducted from the oldest bucket first. The age is the
 * difference between the expense date and the bucket date.
 */
export function calculateAgeOfMoney(
  incomeTransactions: Transaction[],
  expenseTransactions: Transaction[],
): { ages: Array<{ date: string; age: number }>; insufficientData: boolean } {
  // Sort income by date ascending (oldest first)
  const sortedIncome = [...incomeTransactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Create income buckets
  const buckets: IncomeBucket[] = sortedIncome.map(t => ({
    date: t.date,
    remainingAmount: t.amount, // Income is positive
  }));

  // Sort expenses by date ascending
  const sortedExpenses = [...expenseTransactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const ages: Array<{ date: string; age: number }> = [];
  let currentBucketIdx = 0;
  let insufficientData = false;

  for (const expense of sortedExpenses) {
    // Expense amounts are negative, so we work with absolute value
    let remainingExpense = Math.abs(expense.amount);
    let lastBucketDate: string | null = null;

    // Deduct from oldest buckets with remaining balance
    while (remainingExpense > 0 && currentBucketIdx < buckets.length) {
      const bucket = buckets[currentBucketIdx];

      if (bucket.remainingAmount > 0) {
        const deduction = Math.min(bucket.remainingAmount, remainingExpense);
        bucket.remainingAmount -= deduction;
        remainingExpense -= deduction;
        lastBucketDate = bucket.date;
      }

      // Move to next bucket if current is exhausted
      if (bucket.remainingAmount <= 0) {
        currentBucketIdx++;
      }
    }

    // If we couldn't fully cover the expense, we have insufficient data
    if (remainingExpense > 0) {
      insufficientData = true;
      // Continue processing but note the issue
    }

    // Calculate age if we had a bucket to draw from
    if (lastBucketDate) {
      const expenseDate = d.parseISO(expense.date);
      const bucketDate = d.parseISO(lastBucketDate);
      const ageInDays = d.differenceInDays(expenseDate, bucketDate);
      ages.push({ date: expense.date, age: Math.max(0, ageInDays) });
    }
  }

  return { ages, insufficientData };
}

/**
 * Calculate the average of the last N ages
 */
export function calculateAverageAge(
  ages: Array<{ date: string; age: number }>,
  count: number = 10,
): number | null {
  if (ages.length === 0) return null;

  const lastN = ages.slice(-count);
  const sum = lastN.reduce((acc, item) => acc + item.age, 0);
  return Math.round(sum / lastN.length);
}

/**
 * Get the period key for a given date based on granularity
 */
export function getPeriodKey(
  date: string,
  granularity: AgeOfMoneyGranularity,
): string {
  const parsed = d.parseISO(date);
  switch (granularity) {
    case 'daily':
      return date; // YYYY-MM-DD
    case 'weekly': {
      // Use start of week (Monday) as key
      const weekStart = d.startOfWeek(parsed, { weekStartsOn: 1 });
      return d.format(weekStart, 'yyyy-MM-dd');
    }
    case 'monthly':
    default:
      return monthUtils.getMonth(date); // YYYY-MM
  }
}

/**
 * Format a period key for display based on granularity
 */
export function formatPeriodLabel(
  periodKey: string,
  granularity: AgeOfMoneyGranularity,
): string {
  switch (granularity) {
    case 'daily':
      return d.format(d.parseISO(periodKey), 'MMM d, yyyy');
    case 'weekly':
      return d.format(d.parseISO(periodKey), 'MMM d, yyyy');
    case 'monthly':
    default:
      return d.format(d.parseISO(periodKey + '-01'), 'MMM yyyy');
  }
}

/**
 * Generate all periods between start and end based on granularity
 */
export function generatePeriods(
  startDate: string,
  endDate: string,
  granularity: AgeOfMoneyGranularity,
): string[] {
  const periods: string[] = [];
  let current = d.parseISO(startDate);
  const end = d.parseISO(endDate);

  switch (granularity) {
    case 'daily':
      while (current <= end) {
        periods.push(d.format(current, 'yyyy-MM-dd'));
        current = d.addDays(current, 1);
      }
      break;
    case 'weekly':
      // Start from the beginning of the week containing startDate
      current = d.startOfWeek(current, { weekStartsOn: 1 });
      while (current <= end) {
        periods.push(d.format(current, 'yyyy-MM-dd'));
        current = d.addWeeks(current, 1);
      }
      break;
    case 'monthly':
    default: {
      const months = monthUtils.rangeInclusive(
        monthUtils.getMonth(startDate),
        monthUtils.getMonth(endDate),
      );
      return months;
    }
  }

  return periods;
}

/**
 * Group ages by period and calculate rolling average for each period
 */
export function calculateGraphData(
  ages: Array<{ date: string; age: number }>,
  startMonth: string,
  endMonth: string,
  granularity: AgeOfMoneyGranularity = 'monthly',
): Array<{ date: string; ageOfMoney: number }> {
  const startDate = monthUtils.firstDayOfMonth(startMonth);
  const endDate = monthUtils.lastDayOfMonth(endMonth);
  const periods = generatePeriods(startDate, endDate, granularity);
  const result: Array<{ date: string; ageOfMoney: number }> = [];

  // Group ages by period
  const agesByPeriod: Record<string, number[]> = {};
  for (const { date, age } of ages) {
    const periodKey = getPeriodKey(date, granularity);
    if (!agesByPeriod[periodKey]) {
      agesByPeriod[periodKey] = [];
    }
    agesByPeriod[periodKey].push(age);
  }

  // Calculate cumulative rolling average (last 10 expenses up to each period)
  let allAgesUpToPeriod: number[] = [];

  for (const period of periods) {
    // Add ages from this period
    if (agesByPeriod[period]) {
      allAgesUpToPeriod = allAgesUpToPeriod.concat(agesByPeriod[period]);
    }

    // Calculate average of last 10 ages
    if (allAgesUpToPeriod.length > 0) {
      const lastN = allAgesUpToPeriod.slice(-10);
      const avg = Math.round(lastN.reduce((a, b) => a + b, 0) / lastN.length);
      result.push({
        date: formatPeriodLabel(period, granularity),
        ageOfMoney: avg,
      });
    }
  }

  return result;
}

/**
 * Determine the trend based on the last few data points
 */
export function calculateTrend(
  graphData: Array<{ date: string; ageOfMoney: number }>,
): 'up' | 'down' | 'stable' {
  if (graphData.length < 2) return 'stable';

  const last = graphData[graphData.length - 1].ageOfMoney;
  const secondLast = graphData[graphData.length - 2].ageOfMoney;

  const diff = last - secondLast;
  const threshold = 2; // Days threshold for "stable"

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

export type AgeOfMoneyParams = {
  start: string;
  end: string;
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  granularity?: AgeOfMoneyGranularity;
};

export function createAgeOfMoneySpreadsheet({
  start,
  end,
  conditions = [],
  conditionsOp = 'and',
  granularity = 'monthly',
}: AgeOfMoneyParams) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: AgeOfMoneyData) => void,
  ) => {
    const endDate = monthUtils.lastDayOfMonth(end);
    const today = monthUtils.currentDay();
    const fixedEnd = endDate > today ? today : endDate;

    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    // Query for ALL income transactions up to the end date
    // FIFO requires complete income history to calculate ages correctly
    function makeIncomeQuery() {
      return q('transactions')
        .filter({
          [conditionsOpKey]: filters,
        })
        .filter({
          date: { $lte: fixedEnd },
          'account.offbudget': false,
          'payee.transfer_acct': null,
          amount: { $gt: 0 },
        })
        .select(['id', 'date', 'amount']);
    }

    // Query for ALL expense transactions up to the end date
    // FIFO requires complete expense history to properly consume income buckets
    function makeExpenseQuery() {
      return q('transactions')
        .filter({
          [conditionsOpKey]: filters,
        })
        .filter({
          date: { $lte: fixedEnd },
          'account.offbudget': false,
          'payee.transfer_acct': null,
          amount: { $lt: 0 },
        })
        .select(['id', 'date', 'amount']);
    }

    return runAll([makeIncomeQuery(), makeExpenseQuery()], data => {
      const [incomeData, expenseData] = data as [Transaction[], Transaction[]];

      // Calculate ages using FIFO method on ALL historical data
      const { ages, insufficientData } = calculateAgeOfMoney(
        incomeData,
        expenseData,
      );

      // Filter ages to only those within the display range
      const displayStart = monthUtils.firstDayOfMonth(start);
      const filteredAges = ages.filter(({ date }) => date >= displayStart);

      // Generate graph data from filtered ages with specified granularity
      const graphData = calculateGraphData(
        filteredAges,
        start,
        end,
        granularity,
      );

      // Calculate current age from ages within the display range
      const currentAge = calculateAverageAge(filteredAges, 10);

      // Determine trend
      const trend = calculateTrend(graphData);

      setData({
        graphData,
        currentAge,
        trend,
        insufficientData,
      });
    });
  };
}
