import * as d from 'date-fns';

import type { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { NetWorthWidget, RuleConditionEntity } from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type AccountRow = {
  id: string;
  name: string;
};

type StartingRow = {
  account?: string;
  amount?: number;
};

type BalanceRow = {
  account?: string;
  amount?: number;
  date?: string;
};

type Balance = {
  amount: number;
  date: string;
};

function conditionsToFilters(conditions?: RuleConditionEntity[]) {
  return conditionsToAQL((conditions ?? []).filter(cond => !cond.customName))
    .filters;
}

function getIntervalGroup(interval: string) {
  if (interval === 'Yearly') {
    return { $year: '$date' };
  }
  if (interval === 'Daily' || interval === 'Weekly') {
    return 'date';
  }
  return { $month: '$date' };
}

function getReportDates({
  earliestTransactionDate,
  end,
  firstDayOfWeekIdx,
  interval,
  start,
}: {
  earliestTransactionDate: string | null;
  end: string;
  firstDayOfWeekIdx: string;
  interval: string;
  start: string;
}) {
  const rangeStart = d.parseISO(monthUtils.firstDayOfMonth(start));
  let startDate: string;
  if (interval === 'Daily') {
    startDate = monthUtils.dayFromDate(d.subDays(rangeStart, 1));
  } else if (interval === 'Weekly') {
    startDate = monthUtils.weekFromDate(
      d.subDays(rangeStart, 1),
      firstDayOfWeekIdx,
    );
  } else {
    startDate = monthUtils.firstDayOfMonth(monthUtils.prevMonth(start));
  }

  if (
    earliestTransactionDate &&
    earliestTransactionDate >= monthUtils.firstDayOfMonth(start)
  ) {
    if (interval === 'Daily') {
      startDate = earliestTransactionDate;
    } else if (interval === 'Weekly') {
      startDate = monthUtils.weekFromDate(
        earliestTransactionDate,
        firstDayOfWeekIdx,
      );
    } else {
      startDate = monthUtils.firstDayOfMonth(start);
    }
  }

  let endDate = monthUtils.lastDayOfMonth(end);
  if (interval === 'Daily' || interval === 'Weekly') {
    const today = monthUtils.currentDay();
    if (monthUtils.isAfter(endDate, today)) {
      endDate = today;
    }
  }

  return { endDate, startDate };
}

function makeAccountsQuery() {
  return q('accounts')
    .filter({ closed: false })
    .select(['id', 'name'])
    .orderBy('sort_order')
    .orderBy('name')
    .serialize();
}

function makeStartingQuery({
  conditions,
  conditionsOp,
  startDate,
}: {
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or' | undefined;
  startDate: string;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  return q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
      date: { $lt: startDate },
    })
    .groupBy('account')
    .select(['account', { amount: { $sum: '$amount' } }])
    .serialize();
}

function makeBalancesQuery({
  conditions,
  conditionsOp,
  endDate,
  interval,
  startDate,
}: {
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or' | undefined;
  endDate: string;
  interval: string;
  startDate: string;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  const intervalGroup = getIntervalGroup(interval);
  return q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
      $and: [{ date: { $gte: startDate } }, { date: { $lte: endDate } }],
    })
    .groupBy(['account', intervalGroup])
    .select([
      'account',
      { date: intervalGroup },
      { amount: { $sum: '$amount' } },
    ])
    .serialize();
}

function getIntervals({
  endDate,
  firstDayOfWeekIdx,
  interval,
  startDate,
}: {
  endDate: string;
  firstDayOfWeekIdx: string;
  interval: string;
  startDate: string;
}) {
  if (interval === 'Weekly') {
    return monthUtils.weekRangeInclusive(startDate, endDate, firstDayOfWeekIdx);
  }
  if (interval === 'Daily') {
    return monthUtils.dayRangeInclusive(startDate, endDate);
  }
  if (interval === 'Yearly') {
    return monthUtils.yearRangeInclusive(startDate, endDate);
  }
  return monthUtils.rangeInclusive(
    monthUtils.getMonth(startDate),
    monthUtils.getMonth(endDate),
  );
}

function buildAccountBalances({
  balances,
  firstDayOfWeekIdx,
  interval,
}: {
  balances: BalanceRow[];
  firstDayOfWeekIdx: string;
  interval: string;
}) {
  const byAccount = new Map<string, Record<string, Balance>>();

  for (const balance of balances) {
    if (!balance.account || !balance.date) {
      continue;
    }

    const date =
      interval === 'Weekly'
        ? monthUtils.weekFromDate(balance.date, firstDayOfWeekIdx)
        : balance.date;
    const accountBalances = byAccount.get(balance.account) ?? {};
    const existing = accountBalances[date]?.amount ?? 0;
    accountBalances[date] = {
      amount: existing + (balance.amount ?? 0),
      date,
    };
    byAccount.set(balance.account, accountBalances);
  }

  return byAccount;
}

function formatDisplayDate(interval: string, intervalItem: string) {
  let date: Date;
  if (interval === 'Daily' || interval === 'Weekly') {
    date = d.parseISO(intervalItem);
  } else if (interval === 'Yearly') {
    date = d.parseISO(intervalItem + '-01-01');
  } else {
    date = d.parseISO(intervalItem + '-01');
  }

  const displayFormat =
    interval === 'Daily'
      ? 'yy-MM-dd'
      : interval === 'Weekly'
        ? 'MMM d'
        : interval === 'Yearly'
          ? 'yyyy'
          : "MMM ''yy";
  const tooltipFormat =
    interval === 'Daily'
      ? 'MMMM d, yyyy'
      : interval === 'Weekly'
        ? 'MMM d, yyyy'
        : interval === 'Yearly'
          ? 'yyyy'
          : 'MMMM yyyy';

  return {
    date: d.format(date, tooltipFormat),
    x: d.format(date, displayFormat),
  };
}

function calculateNetWorthData({
  accounts,
  balances,
  endDate,
  firstDayOfWeekIdx,
  interval,
  startDate,
  startingRows,
}: {
  accounts: AccountRow[];
  balances: BalanceRow[];
  endDate: string;
  firstDayOfWeekIdx: string;
  interval: string;
  startDate: string;
  startingRows: StartingRow[];
}): JSONValue {
  const startingByAccount = new Map(
    startingRows.flatMap(row =>
      row.account ? [[row.account, row.amount ?? 0] as const] : [],
    ),
  );
  const balancesByAccount = buildAccountBalances({
    balances,
    firstDayOfWeekIdx,
    interval,
  });
  const intervals = getIntervals({
    endDate,
    firstDayOfWeekIdx,
    interval,
    startDate,
  });

  const accountBalances = accounts.map(account => {
    let balance = startingByAccount.get(account.id) ?? 0;
    const accountBalanceRows = balancesByAccount.get(account.id) ?? {};
    return intervals.map(intervalItem => {
      if (accountBalanceRows[intervalItem]) {
        balance += accountBalanceRows[intervalItem].amount;
      }
      return balance;
    });
  });

  const priorPeriodNetWorth = accounts.reduce(
    (sum, account) => sum + (startingByAccount.get(account.id) ?? 0),
    0,
  );

  let hasNegative = false;
  let startNetWorth = 0;
  let endNetWorth = 0;
  let lowestNetWorth: number | null = null;
  let highestNetWorth: number | null = null;

  const graphRows: JSONValue[] = [];

  for (let idx = 0; idx < intervals.length; idx++) {
    const intervalItem = intervals[idx];
    let assets = 0;
    let debt = 0;
    let total = 0;
    const balancesById: Record<string, JSONValue> = {};

    accountBalances.forEach((balancesForAccount, accountIndex) => {
      const balance = balancesForAccount[idx];
      balancesById[accounts[accountIndex].id] = balance;
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

    const previous = graphRows.at(-1);
    const previousTotal =
      previous && typeof previous === 'object' && !Array.isArray(previous)
        ? previous.y
        : null;
    const change =
      typeof previousTotal === 'number'
        ? total - previousTotal
        : total - priorPeriodNetWorth;

    if (idx === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;

    const graphPoint = {
      ...formatDisplayDate(interval, intervalItem),
      ...balancesById,
      assets,
      change,
      debt,
      networth: total,
      y: total,
    };

    graphRows.push(graphPoint);

    if (lowestNetWorth === null || total < lowestNetWorth) {
      lowestNetWorth = total;
    }
    if (highestNetWorth === null || total > highestNetWorth) {
      highestNetWorth = total;
    }
  }

  const hasBalance = accountBalances.map(balancesForAccount =>
    balancesForAccount.some(balance => balance !== 0),
  );

  return {
    accounts: accounts
      .filter((_, index) => hasBalance[index])
      .map(account => ({ id: account.id, name: account.name })),
    graphData: {
      data: graphRows,
      end: endDate,
      hasNegative,
      start: startDate,
    },
    highestNetWorth,
    lowestNetWorth,
    netWorth: endNetWorth,
    totalChange: endNetWorth - startNetWorth,
  };
}

export function createNetWorthReportPlan({
  earliestTransactionDate,
  firstDayOfWeekIdx,
  latestTransactionDate,
  sheet,
  widget,
}: {
  earliestTransactionDate: string | null;
  firstDayOfWeekIdx: string;
  latestTransactionDate: string | null;
  sheet: Spreadsheet;
  widget: NetWorthWidget;
}): ReportPlan {
  const meta = widget.meta;
  const interval = meta?.interval || 'Monthly';
  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    undefined,
    latestTransactionDate,
  );
  const { endDate, startDate } = getReportDates({
    earliestTransactionDate,
    end,
    firstDayOfWeekIdx,
    interval,
    start,
  });
  const planHash = hashString(
    stableStringify({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      end,
      endDate,
      firstDayOfWeekIdx,
      interval,
      start,
      startDate,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const accountsCell = resolveName(sheetName, 'accounts-query');
  const startingCell = resolveName(sheetName, 'starting-query');
  const balancesCell = resolveName(sheetName, 'balances-query');
  const queryCells = [accountsCell, startingCell, balancesCell];

  sheet.createQuery(sheetName, 'accounts-query', makeAccountsQuery());
  sheet.createQuery(
    sheetName,
    'starting-query',
    makeStartingQuery({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      startDate,
    }),
  );
  sheet.createQuery(
    sheetName,
    'balances-query',
    makeBalancesQuery({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate,
      interval,
      startDate,
    }),
  );

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (...values: JSONValue[]) =>
      calculateNetWorthData({
        accounts: Array.isArray(values[0]) ? (values[0] as AccountRow[]) : [],
        startingRows: Array.isArray(values[1])
          ? (values[1] as StartingRow[])
          : [],
        balances: Array.isArray(values[2]) ? (values[2] as BalanceRow[]) : [],
        endDate,
        firstDayOfWeekIdx,
        interval,
        startDate,
      }),
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
