import * as d from 'date-fns';
import type { Locale } from 'date-fns';
import keyBy from 'lodash/keyBy';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import type {
  AccountEntity,
  RuleConditionEntity,
} from 'loot-core/types/models';
import type { SyncedPrefs } from 'loot-core/types/prefs';

import { ReportOptions } from '@desktop-client/components/reports/ReportOptions';
import type { FormatType } from '@desktop-client/hooks/useFormat';
import type { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type Balance = {
  date: string;
  amount: number;
};

type NetWorthData = ReturnType<typeof recalculate>;
type BudgetMonthCell = { name: string; value: string | number | boolean };

function getDisplayFormat(interval: string) {
  return ReportOptions.intervalFormat.get(interval) ?? "MMM ''yy";
}

function getTooltipFormat(interval: string) {
  if (interval === 'Daily') {
    return 'MMMM d, yyyy';
  }
  if (interval === 'Weekly') {
    return 'MMM d, yyyy';
  }
  if (interval === 'Yearly') {
    return 'yyyy';
  }
  return 'MMMM yyyy';
}

function buildGraphPoint({
  interval,
  locale,
  format,
  month,
  total,
  change,
  isProjection,
}: {
  interval: string;
  locale: Locale;
  format: (value: unknown, type?: FormatType) => string;
  month: string;
  total: number;
  change: number;
  isProjection?: boolean;
}) {
  const displayFormat = getDisplayFormat(interval);
  const tooltipFormat = getTooltipFormat(interval);
  const x = d.parseISO(month + '-01');
  const assetsValue = total >= 0 ? total : 0;
  const debtValue = total < 0 ? -total : 0;

  return {
    x: d.format(x, displayFormat, { locale }),
    y: total,
    assets: format(assetsValue, 'financial'),
    debt: `-${format(debtValue, 'financial')}`,
    change: format(change, 'financial'),
    networth: format(total, 'financial'),
    date: d.format(x, tooltipFormat, { locale }),
    isProjection,
  };
}

export function createSpreadsheet(
  start: string,
  end: string,
  accounts: AccountEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  locale: Locale,
  interval: string = 'Monthly',
  firstDayOfWeekIdx: string = '0',
  format: (value: unknown, type?: FormatType) => string,
  showProjection: boolean = false,
  budgetType: SyncedPrefs['budgetType'] = 'envelope',
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: NetWorthData) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    // Convert dates to ensure we have the full range. Then clamp end date to avoid future projections
    const startDate = monthUtils.firstDayOfMonth(start);

    // Start with the provided end-of-month date, then adjust for current context
    let endDate = monthUtils.lastDayOfMonth(end);

    if (interval === 'Daily') {
      const today = monthUtils.currentDay();
      if (monthUtils.isAfter(endDate, today)) {
        endDate = today;
      }
    } else if (interval === 'Weekly') {
      // Include the ongoing (current) week up to today instead of clamping to the
      // start of the current week. This ensures the current week appears in the
      // report even if the week hasn't finished yet.
      const today = monthUtils.currentDay();
      if (monthUtils.isAfter(endDate, today)) {
        endDate = today;
      }
    }

    const data = await Promise.all(
      accounts.map(async acct => {
        const [starting, balances]: [number, Balance[]] = await Promise.all([
          aqlQuery(
            q('transactions')
              .filter({
                [conditionsOpKey]: filters,
                account: acct.id,
                date: { $lt: startDate },
              })
              .calculate({ $sum: '$amount' }),
          ).then(({ data }) => data),

          aqlQuery(
            q('transactions')
              .filter({
                [conditionsOpKey]: filters,
              })
              .filter({
                account: acct.id,
                $and: [
                  { date: { $gte: startDate } },
                  { date: { $lte: endDate } },
                ],
              })
              .groupBy(
                interval === 'Yearly'
                  ? { $year: '$date' }
                  : interval === 'Daily' || interval === 'Weekly'
                    ? 'date'
                    : { $month: '$date' },
              )
              .select([
                {
                  date:
                    interval === 'Yearly'
                      ? { $year: '$date' }
                      : interval === 'Daily' || interval === 'Weekly'
                        ? 'date'
                        : { $month: '$date' },
                },
                { amount: { $sum: '$amount' } },
              ]),
          ).then(({ data }) => data),
        ]);

        // For weekly intervals, transform dates to week format and properly aggregate
        let processedBalances: Record<string, Balance>;
        if (interval === 'Weekly') {
          // Group transactions by week and sum their amounts
          const weeklyBalances: Record<string, number> = {};
          balances.forEach(b => {
            const weekDate = monthUtils.weekFromDate(b.date, firstDayOfWeekIdx);
            weeklyBalances[weekDate] =
              (weeklyBalances[weekDate] || 0) + b.amount;
          });

          // Convert back to Balance format
          processedBalances = {};
          Object.entries(weeklyBalances).forEach(([date, amount]) => {
            processedBalances[date] = { date, amount };
          });
        } else {
          processedBalances = keyBy(balances, 'date');
        }

        return {
          id: acct.id,
          name: acct.name,
          balances: processedBalances,
          starting,
          hasCurrentMonthTransactions: balances.some(
            b => b.date === monthUtils.currentMonth(),
          ),
        };
      }),
    );

    let results = recalculate(
      data,
      startDate,
      endDate,
      locale,
      interval,
      firstDayOfWeekIdx,
      format,
    );

    if (showProjection && interval === 'Monthly') {
      results = await applyProjection({
        data: results,
        hasCurrentMonthTransactions: data.some(
          account => account.hasCurrentMonthTransactions,
        ),
        startDate,
        endDate,
        locale,
        format,
        budgetType,
      });
    }

    setData(results);
  };
}

function recalculate(
  data: Array<{
    id: string;
    name: string;
    balances: Record<string, Balance>;
    starting: number;
  }>,
  startDate: string,
  endDate: string,
  locale: Locale,
  interval: string = 'Monthly',
  firstDayOfWeekIdx: string = '0',
  format: (value: unknown, type?: FormatType) => string,
) {
  // Get intervals using the same pattern as other working spreadsheets
  const intervals =
    interval === 'Weekly'
      ? monthUtils.weekRangeInclusive(startDate, endDate, firstDayOfWeekIdx)
      : interval === 'Daily'
        ? monthUtils.dayRangeInclusive(startDate, endDate)
        : interval === 'Yearly'
          ? monthUtils.yearRangeInclusive(startDate, endDate)
          : monthUtils.rangeInclusive(
              monthUtils.getMonth(startDate),
              monthUtils.getMonth(endDate),
            );

  const accountBalances = data.map(account => {
    let balance = account.starting;
    return intervals.map(intervalItem => {
      if (account.balances[intervalItem]) {
        balance += account.balances[intervalItem].amount;
      }
      return balance;
    });
  });

  let hasNegative = false;
  let startNetWorth = 0;
  let endNetWorth = 0;
  let lowestNetWorth: number | null = null;
  let highestNetWorth: number | null = null;

  const graphData = intervals.reduce<
    Array<{
      x: string;
      y: number;
      assets: string;
      debt: string;
      change: string;
      networth: string;
      date: string;
      isProjection?: boolean;
    }>
  >((arr, intervalItem, idx) => {
    let debt = 0;
    let assets = 0;
    let total = 0;
    const last = arr.length === 0 ? null : arr[arr.length - 1];

    const balances: Record<string, number> = {};
    accountBalances.forEach((acctBalances, i) => {
      const balance = acctBalances[idx];
      balances[data[i].id] = balance;

      if (balance < 0) {
        debt += -balance;
      } else {
        assets += balance;
      }
      total += balance;
    });

    if (total < 0) {
      hasNegative = true;
    }

    // Parse dates based on interval type - following the working pattern
    let x: Date;
    if (interval === 'Daily' || interval === 'Weekly') {
      x = d.parseISO(intervalItem);
    } else if (interval === 'Yearly') {
      x = d.parseISO(intervalItem + '-01-01');
    } else {
      x = d.parseISO(intervalItem + '-01');
    }

    const change = last ? total - last.y : 0;

    if (arr.length === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;

    const displayFormat = getDisplayFormat(interval);
    const tooltipFormat = getTooltipFormat(interval);

    const graphPoint = {
      x: d.format(x, displayFormat, { locale }),
      y: total,
      assets: format(assets, 'financial'),
      debt: `-${format(debt, 'financial')}`,
      change: format(change, 'financial'),
      networth: format(total, 'financial'),
      date: d.format(x, tooltipFormat, { locale }),
      ...balances,
    };

    arr.push(graphPoint);

    // Track min/max for the current point only
    if (lowestNetWorth === null || graphPoint.y < lowestNetWorth) {
      lowestNetWorth = graphPoint.y;
    }
    if (highestNetWorth === null || graphPoint.y > highestNetWorth) {
      highestNetWorth = graphPoint.y;
    }

    return arr;
  }, []);

  const hasBalance = accountBalances.map(balances =>
    balances.some(b => b !== 0),
  );

  return {
    graphData: {
      data: graphData,
      hasNegative,
      start: startDate,
      end: endDate,
    },
    netWorth: endNetWorth,
    totalChange: endNetWorth - startNetWorth,
    lowestNetWorth,
    highestNetWorth,
    accounts: data
      .filter((_, i) => hasBalance[i])
      .map(d => ({ id: d.id, name: d.name })),
  };
}

async function applyProjection({
  data,
  hasCurrentMonthTransactions,
  startDate,
  endDate,
  locale,
  format,
  budgetType,
}: {
  data: NetWorthData;
  hasCurrentMonthTransactions: boolean;
  startDate: string;
  endDate: string;
  locale: Locale;
  format: (value: unknown, type?: FormatType) => string;
  budgetType: SyncedPrefs['budgetType'];
}) {
  const currentMonth = monthUtils.currentMonth();
  const startMonth = monthUtils.getMonth(startDate);
  const endMonth = monthUtils.getMonth(endDate);

  if (
    monthUtils.isBefore(currentMonth, startMonth) ||
    monthUtils.isAfter(currentMonth, endMonth)
  ) {
    return data;
  }

  const intervals = monthUtils.rangeInclusive(startMonth, endMonth);
  const currentIndex = intervals.indexOf(currentMonth);
  if (currentIndex === -1) {
    return data;
  }

  const currentPoint = data.graphData.data[currentIndex];
  if (!currentPoint) {
    return data;
  }

  const budgetMethod =
    budgetType === 'tracking'
      ? 'tracking-budget-month'
      : 'envelope-budget-month';

  const getBudgetValue = (values: BudgetMonthCell[], name: string) => {
    const value = values.find(cell => cell.name.endsWith(name))?.value;
    return typeof value === 'number' ? value : 0;
  };

  const calculateNetChange = (values: BudgetMonthCell[]) => {
    const totalBudgeted = getBudgetValue(values, 'total-budgeted');
    const totalBudgetIncome =
      budgetType === 'tracking'
        ? getBudgetValue(values, 'total-budget-income')
        : 0;

    return {
      totalBudgeted,
      totalBudgetIncome,
      netChange:
        budgetType === 'tracking'
          ? totalBudgetIncome - totalBudgeted
          : totalBudgeted,
    };
  };

  const dataWithProjection = [...data.graphData.data];
  let lastTotal = currentPoint.y;

  if (!hasCurrentMonthTransactions) {
    const currentMonthBudgetData = await send(budgetMethod, {
      month: currentMonth,
    });
    const previousTotal =
      currentIndex > 0
        ? data.graphData.data[currentIndex - 1].y
        : currentPoint.y;
    const { netChange } = calculateNetChange(currentMonthBudgetData);
    const projectedCurrentTotal = previousTotal + netChange;

    dataWithProjection[currentIndex] = buildGraphPoint({
      interval: 'Monthly',
      locale,
      format,
      month: currentMonth,
      total: projectedCurrentTotal,
      change: projectedCurrentTotal - previousTotal,
      isProjection: true,
    });
    lastTotal = projectedCurrentTotal;
  }

  const { end: budgetEnd } = await send('get-budget-bounds');
  const projectedPoints = [];
  let month = monthUtils.addMonths(currentMonth, 1);

  while (!monthUtils.isAfter(month, budgetEnd)) {
    const monthData = await send(budgetMethod, { month });
    const { totalBudgeted, totalBudgetIncome, netChange } =
      calculateNetChange(monthData);

    if (totalBudgetIncome === 0 && totalBudgeted === 0) {
      break;
    }

    const total = lastTotal + netChange;

    projectedPoints.push(
      buildGraphPoint({
        interval: 'Monthly',
        locale,
        format,
        month,
        total,
        change: total - lastTotal,
        isProjection: true,
      }),
    );

    lastTotal = total;
    month = monthUtils.addMonths(month, 1);
  }

  if (projectedPoints.length === 0) {
    return {
      ...data,
      graphData: {
        ...data.graphData,
        data: dataWithProjection,
      },
    };
  }

  const lastProjectionMonth = monthUtils.addMonths(month, -1);
  const projectedEndDate = monthUtils.lastDayOfMonth(lastProjectionMonth);

  return {
    ...data,
    graphData: {
      ...data.graphData,
      end: projectedEndDate,
      hasNegative:
        data.graphData.hasNegative || projectedPoints.some(p => p.y < 0),
      data: [...dataWithProjection, ...projectedPoints],
    },
  };
}
