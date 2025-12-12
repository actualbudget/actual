import * as d from 'date-fns';

import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { type AccountEntity } from 'loot-core/types/models';

import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type MonthlyAgg = { date: string; amount: number };

// Utility functions for Hampel identifier
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculateMAD(values: number[], median: number): number {
  const deviations = values.map(v => Math.abs(v - median));
  return calculateMedian(deviations);
}

function calculateHampelFilteredMedian(expenses: number[]): number {
  if (expenses.length === 0) return 0;
  if (expenses.length === 1) return expenses[0];

  const median = calculateMedian(expenses);
  const mad = calculateMAD(expenses, median);
  const threshold = 3; // Standard threshold for outlier detection

  const filteredExpenses = expenses.filter(expense => {
    const lowerBound = median - 1.4826 * mad * threshold;
    const upperBound = median + 1.4826 * mad * threshold;
    return expense >= lowerBound && expense <= upperBound;
  });

  return calculateMedian(filteredExpenses);
}

export type CrossoverParams = {
  start: string;
  end: string;
  expenseCategoryIds: string[]; // which categories count as expenses
  incomeAccountIds: AccountEntity['id'][]; // selected accounts for both historical returns and projections
  safeWithdrawalRate: number; // annual percent, e.g. 0.04 for 4%
  estimatedReturn?: number | null; // optional annual return to project future balances
  projectionType: 'trend' | 'hampel'; // expense projection method
};

export function createCrossoverSpreadsheet({
  start,
  end,
  expenseCategoryIds,
  incomeAccountIds,
  safeWithdrawalRate,
  estimatedReturn,
  projectionType,
}: CrossoverParams) {
  return async (
    _spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof recalculate>) => void,
  ) => {
    if (!start || !end || incomeAccountIds.length === 0) {
      setData({
        graphData: {
          data: [],
          start: start || '',
          end: end || '',
          crossoverXLabel: null,
        },
        lastKnownBalance: 0,
        lastKnownMonthlyIncome: 0,
        lastKnownMonthlyExpenses: 0,
        historicalReturn: null,
        yearsToRetire: null,
        targetMonthlyIncome: null,
      });
      return;
    }

    // Aggregate monthly expenses for selected categories (expenses are negative amounts)
    const expensesPromise = (async () => {
      if (!expenseCategoryIds.length) {
        return monthUtils
          .rangeInclusive(start, end)
          .map(date => ({ date, amount: 0 }));
      }

      const query = q('transactions')
        .filter({
          $and: [
            { $or: expenseCategoryIds.map(id => ({ category: id })) },
            { date: { $gte: monthUtils.firstDayOfMonth(start) } },
            { date: { $lte: monthUtils.lastDayOfMonth(end) } },
          ],
        })
        .groupBy({ $month: '$date' })
        .select([
          { date: { $month: '$date' } },
          { amount: { $sum: '$amount' } },
        ]);

      const { data } = await aqlQuery(query);
      return data as MonthlyAgg[];
    })();

    // Compute monthly balances for selected accounts (historical returns)
    const historicalBalancesPromise = Promise.all(
      incomeAccountIds.map(async accountId => {
        // Get the account balance at the end of the first month (start month)
        const startingBalance = await aqlQuery(
          q('transactions')
            .filter({ account: accountId })
            .filter({
              date: { $lte: monthUtils.lastDayOfMonth(start) },
            })
            .calculate({ $sum: '$amount' }),
        ).then(({ data }) => (typeof data === 'number' ? data : 0));
        // Get all transactions from the start month onwards for balance calculations
        // We need to exclude the first month since we already have its ending balance as starting
        // Instead of adding months (which can cause invalid month strings), we'll filter out the first month later
        const balances = await aqlQuery(
          q('transactions')
            .filter({
              account: accountId,
              date: { $gte: monthUtils.firstDayOfMonth(start) },
            })
            .filter({
              $and: [{ date: { $lte: monthUtils.lastDayOfMonth(end) } }],
            })
            .groupBy({ $month: '$date' })
            .select([
              { date: { $month: '$date' } },
              { amount: { $sum: '$amount' } },
            ]),
        ).then(({ data }) => data as MonthlyAgg[]);

        // Filter out the first month since we already have its ending balance as starting
        const filteredBalances = balances.filter(b => b.date !== start);

        return {
          accountId,
          starting: startingBalance,
          balances: filteredBalances,
        };
      }),
    );

    const [expenses, historicalBalances] = await Promise.all([
      expensesPromise,
      historicalBalancesPromise,
    ]);

    setData(
      recalculate(
        {
          start,
          end,
          expenseCategoryIds,
          incomeAccountIds,
          safeWithdrawalRate,
          estimatedReturn,
          projectionType,
        },
        expenses,
        historicalBalances,
      ),
    );
  };
}

function recalculate(
  params: Pick<
    CrossoverParams,
    | 'start'
    | 'end'
    | 'expenseCategoryIds'
    | 'incomeAccountIds'
    | 'safeWithdrawalRate'
    | 'estimatedReturn'
    | 'projectionType'
  >,
  expenses: MonthlyAgg[],
  historicalAccounts: Array<{
    accountId: string;
    starting: number;
    balances: MonthlyAgg[];
  }>,
) {
  const months = monthUtils.rangeInclusive(params.start, params.end);

  // Build total expenses per month (positive number for visualization)
  const expenseMap = new Map<string, number>();
  for (const e of expenses) {
    // amounts for expenses are negative; flip sign to positive monthly spend
    expenseMap.set(e.date, (expenseMap.get(e.date) || 0) + -e.amount);
  }

  // Build total balances across selected accounts per month for CAGR calculation (historical returns)
  const historicalBalances: number[] = months.map(() => 0);

  for (const acct of historicalAccounts) {
    // Calculate running balance for each month
    // Start with the account's starting balance (balance at the end of the first month)
    let runningBalance = acct.starting;

    // Process each month in order
    const byMonth = new Map(acct.balances.map(b => [b.date, b.amount]));
    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const delta = byMonth.get(month) ?? 0;

      runningBalance += delta;

      // Add this account's balance to the total for this month
      historicalBalances[i] += runningBalance;
    }
  }

  // Determine historical monthly investment income using safe withdrawal rate: annual rate -> monthly
  const monthlySWR = params.safeWithdrawalRate / 12; // e.g. 0.04 / 12

  // Prepare historical data points and compute last known month data for projection seeds
  const data: Array<{
    x: string;
    investmentIncome: number;
    expenses: number;
    isProjection?: boolean;
  }> = [];

  let lastBalance = 0;
  let lastExpense = 0;
  let crossoverIndex: number | null = null;
  months.forEach((month, idx) => {
    const balance = historicalBalances[idx]; // Use historical balances for data generation
    const monthlyIncome = balance * monthlySWR;
    const spend = expenseMap.get(month) || 0;
    data.push({
      x: d.format(d.parseISO(month + '-01'), 'MMM yyyy'),
      investmentIncome: Math.round(monthlyIncome),
      expenses: spend,
    });
    lastBalance = balance;
    lastExpense = spend;

    // Note: We don't check for crossover in historical data to avoid triggering
    // a crossover detection when expenses drop below the investment income for
    // a short time. Crossover is determined based on projected expenses, not
    // actual historical expenses.
  });

  // If estimatedReturn provided, project future months until investment income exceeds expenses
  // Use either provided estimatedReturn or simple trailing growth from balances
  // Determine default return from historical balances if not provided
  const annualReturn = params.estimatedReturn ?? null; // e.g. 0.05
  let monthlyReturn =
    annualReturn != null ? Math.pow(1 + annualReturn, 1 / 12) - 1 : null;

  // Always calculate the default return for display purposes
  let defaultMonthlyReturn: number | null = null;
  if (historicalBalances.length >= 2) {
    // Use the starting balance (end of first month) and final balance (end of last month) for CAGR calculation
    // The starting balance represents the account balance at the end of the first month
    let startingBalance = historicalBalances[0];
    const finalBalance = historicalBalances[historicalBalances.length - 1];
    const n = historicalBalances.length - 1; // Number of months between start and end

    if (startingBalance === 0) {
      for (let i = 1; i < historicalBalances.length; i++) {
        if (historicalBalances[i] !== 0) {
          startingBalance = historicalBalances[i];
          break;
        }
      }
    }

    if (startingBalance > 0 && finalBalance > 0 && n > 0) {
      // Calculate monthly CAGR: (final/starting)^(1/n) - 1
      const cagrMonthly = Math.pow(finalBalance / startingBalance, 1 / n) - 1;

      if (isFinite(cagrMonthly) && !isNaN(cagrMonthly)) {
        defaultMonthlyReturn = cagrMonthly;
      } else {
        defaultMonthlyReturn = 0;
      }
    } else {
      defaultMonthlyReturn = 0;
    }
  }

  if (months.length > 0) {
    // If no explicit return provided, use the calculated default
    if (monthlyReturn == null) {
      // not quite right.  Need a better approximation
      monthlyReturn = defaultMonthlyReturn;
    }
    // Project up to 600 months max to avoid infinite loops (50 years)
    const maxProjectionMonths = 600;
    let projectedBalance = lastBalance;
    let monthCursor = d.parseISO(months[months.length - 1] + '-01');
    // Calculate expense projection parameters based on projection type
    let expenseSlope = 0;
    let expenseIntercept = lastExpense;
    let hampelFilteredExpense = 0;

    if (expenseMap.size >= 2) {
      const y: number[] = months.map(m => expenseMap.get(m) || 0);

      if (params.projectionType === 'trend') {
        // Linear trend calculation: y = a + b * t
        const x: number[] = months.map((_m, i) => i);
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, xi, idx) => a + xi * y[idx], 0);
        const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
        const denom = n * sumX2 - sumX * sumX;
        if (denom !== 0) {
          expenseSlope = (n * sumXY - sumX * sumY) / denom;
          expenseIntercept = (sumY - expenseSlope * sumX) / n;
        }
      } else if (params.projectionType === 'hampel') {
        // Hampel filtered median calculation
        hampelFilteredExpense = calculateHampelFilteredMedian(y);
      }
    }

    for (let i = 1; i <= maxProjectionMonths; i++) {
      monthCursor = d.addMonths(monthCursor, 1);
      // grow balance
      if (monthlyReturn != null) {
        projectedBalance = projectedBalance * (1 + monthlyReturn);
      }
      const projectedIncome = projectedBalance * monthlySWR;

      // Project expenses based on projection type
      let projectedExpenses: number;
      if (params.projectionType === 'trend') {
        projectedExpenses = Math.max(
          0,
          expenseIntercept + expenseSlope * (months.length - 1 + i),
        );
      } else {
        // Hampel filtered median - flat projection
        projectedExpenses = Math.max(0, hampelFilteredExpense);
      }

      data.push({
        x: d.format(monthCursor, 'MMM yyyy'),
        investmentIncome: Math.round(projectedIncome),
        expenses: Math.round(projectedExpenses),
        isProjection: true,
      });

      if (
        crossoverIndex == null &&
        Math.round(projectedIncome) >= Math.round(projectedExpenses)
      ) {
        crossoverIndex = months.length + (i - 1);
        break;
      }
    }
  }
  // Calculate years to retire based on crossover point
  let yearsToRetire: number | null = null;
  let targetMonthlyIncome: number | null = null;

  if (crossoverIndex != null && crossoverIndex < data.length) {
    const crossoverData = data[crossoverIndex];
    if (crossoverData) {
      const currentDate = new Date();
      const crossoverDate = d.parse(crossoverData.x, 'MMM yyyy', currentDate);
      const monthsDiff = d.differenceInMonths(crossoverDate, currentDate);
      yearsToRetire = monthsDiff > 0 ? monthsDiff / 12 : 0;
      targetMonthlyIncome = crossoverData.expenses;
    }
  }

  return {
    graphData: {
      data,
      start: params.start,
      end: params.end,
      crossoverXLabel:
        crossoverIndex != null ? (data[crossoverIndex]?.x ?? null) : null,
    },
    // Provide some summary numbers
    lastKnownBalance: historicalBalances[historicalBalances.length - 1] || 0,
    lastKnownMonthlyIncome: Math.round(
      (historicalBalances[historicalBalances.length - 1] || 0) * monthlySWR,
    ),
    lastKnownMonthlyExpenses: lastExpense,
    // Return the calculated default return for display purposes
    historicalReturn:
      defaultMonthlyReturn != null
        ? Math.pow(1 + defaultMonthlyReturn, 12) - 1
        : null,
    // Years to retire calculation
    yearsToRetire,
    // Target monthly income at crossover point
    targetMonthlyIncome,
  };
}
