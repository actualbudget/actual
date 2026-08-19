import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  AgeOfMoneyGranularity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import * as d from 'date-fns';

import { runAll } from '#components/reports/util';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';

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
  let endDate = monthUtils.lastDayOfMonth(endMonth);

  // For daily/weekly granularities, don't generate periods past today —
  // future days/weeks would otherwise carry forward the last rolling
  // average and show as a flat horizontal line for the rest of the month.
  // Monthly granularity intentionally keeps the current month visible.
  if (granularity === 'daily' || granularity === 'weekly') {
    const today = monthUtils.currentDay();
    if (monthUtils.isAfter(endDate, today)) {
      endDate = today;
    }
  }

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

type AccountCondition = Extract<RuleConditionEntity, { field: 'account' }>;

/**
 * Invert an account filter op so we can match counterpart accounts that
 * fall *outside* the filtered set.
 */
function invertAccountOp(
  op: AccountCondition['op'],
): AccountCondition['op'] | null {
  switch (op) {
    case 'is':
      return 'isNot';
    case 'isNot':
      return 'is';
    case 'oneOf':
      return 'notOneOf';
    case 'notOneOf':
      return 'oneOf';
    case 'onBudget':
      return 'offBudget';
    case 'offBudget':
      return 'onBudget';
    case 'contains':
      return 'doesNotContain';
    case 'doesNotContain':
      return 'contains';
    // `matches` has no clean inverse in AQL — skip transfer special-casing
    case 'matches':
      return null;
    default:
      return null;
  }
}

/**
 * Build an AQL clause that matches `payee.transfer_acct` against a single
 * (already inverted) account condition.
 */
function accountConditionToTransferAcctAql(
  op: AccountCondition['op'],
  value: AccountCondition['value'],
): Record<string, unknown> | null {
  const field = 'payee.transfer_acct';

  switch (op) {
    case 'is':
      return { [field]: { $eq: value } };
    case 'isNot':
      return { [field]: { $ne: value } };
    case 'oneOf': {
      if (!Array.isArray(value)) return null;
      const values = value;
      if (values.length === 0) return { id: null };
      return { $or: values.map(v => ({ [field]: { $eq: v } })) };
    }
    case 'notOneOf': {
      if (!Array.isArray(value)) return null;
      const values = value;
      // Empty notOneOf is a tautology (everything is outside the empty set).
      if (values.length === 0) return { [field]: { $ne: null } };
      return { $and: values.map(v => ({ [field]: { $ne: v } })) };
    }
    case 'onBudget':
      return { 'payee.transfer_acct.offbudget': false };
    case 'offBudget':
      return { 'payee.transfer_acct.offbudget': true };
    case 'contains': {
      if (typeof value !== 'string') return null;
      return {
        'payee.transfer_acct.name': {
          $transform: '$lower',
          $like: `%${value}%`,
        },
      };
    }
    case 'doesNotContain': {
      if (typeof value !== 'string') return null;
      return {
        'payee.transfer_acct.name': {
          $transform: '$lower',
          $notlike: `%${value}%`,
        },
      };
    }
    default:
      return null;
  }
}

/**
 * Build the transfer-inclusion filter for Age of Money queries.
 *
 * Default (no account filters): exclude on-budget↔on-budget transfers —
 * they are just moving money within the budget pool.
 *
 * With account filters: also include on-budget transfers whose counterpart
 * account is filtered out. From the filtered subset's perspective those
 * transfers are real money leaving (or entering) the pool — e.g. filtering
 * to a chequing account should treat a CC payment as an expenditure so the
 * report reflects "age of cash" rather than budget-wide AoM.
 */
export function buildTransferInclusionFilter(
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or' = 'and',
): Record<string, unknown> {
  const base: Array<Record<string, unknown>> = [
    { 'payee.transfer_acct': null },
    { 'payee.transfer_acct.offbudget': true },
  ];

  const accountConditions = conditions.filter(
    (c): c is AccountCondition => !c.customName && c.field === 'account',
  );

  if (accountConditions.length === 0) {
    return { $or: base };
  }

  // Destination/source is outside the filtered set when it fails the
  // account conditions. De Morgan: AND → OR of negations, OR → AND of
  // negations.
  const negations: Array<Record<string, unknown>> = [];
  for (const cond of accountConditions) {
    const invertedOp = invertAccountOp(cond.op);
    if (invertedOp == null) {
      // Unsupported op — fall back to default transfer exclusion
      return { $or: base };
    }
    const clause = accountConditionToTransferAcctAql(invertedOp, cond.value);
    if (clause == null) {
      return { $or: base };
    }
    negations.push(clause);
  }

  const filteredOutCounterpart =
    conditionsOp === 'and'
      ? negations.length === 1
        ? negations[0]
        : { $or: negations }
      : negations.length === 1
        ? negations[0]
        : { $and: negations };

  return {
    $or: [
      ...base,
      {
        $and: [
          { 'payee.transfer_acct.offbudget': false },
          filteredOutCounterpart,
        ],
      },
    ],
  };
}

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

    const activeConditions = conditions.filter(cond => !cond.customName);
    const { filters } = await send('make-filters-from-conditions', {
      conditions: activeConditions,
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
    const transferFilter = buildTransferInclusionFilter(
      activeConditions,
      conditionsOp,
    );

    // Query for ALL income transactions up to the end date
    // FIFO requires complete income history to calculate ages correctly
    // Includes: regular income + transfers from off-budget accounts
    //   + (when account-filtered) transfers from filtered-out on-budget accounts
    // Excludes: on-budget transfers within the filtered account set
    function makeIncomeQuery() {
      return q('transactions')
        .filter({
          [conditionsOpKey]: filters,
        })
        .filter({
          date: { $lte: fixedEnd },
          'account.offbudget': false,
          ...transferFilter,
          amount: { $gt: 0 },
        })
        .select(['id', 'date', 'amount']);
    }

    // Query for ALL expense transactions up to the end date
    // FIFO requires complete expense history to properly consume income buckets
    // Includes: regular expenses + transfers to off-budget accounts
    //   + (when account-filtered) transfers to filtered-out on-budget accounts
    // Excludes: on-budget transfers within the filtered account set
    function makeExpenseQuery() {
      return q('transactions')
        .filter({
          [conditionsOpKey]: filters,
        })
        .filter({
          date: { $lte: fixedEnd },
          'account.offbudget': false,
          ...transferFilter,
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
