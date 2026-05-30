import { addMonths, format } from 'date-fns';

import * as monthUtils from '#shared/months';
import type { TransactionEntity } from '#types/models';
import type { ForecastDataPoint, ForecastResult } from '#types/models/forecast';

import { matchesForecastFilters } from './forecast-filters';
import type { AccountWithComputedBalance } from './forecast-accounts';
import type { ForecastFilterInfo } from './forecast-filters';
import type { ForecastScheduleOccurrence } from './forecast-schedules';

type ScheduleOccurrenceSummary = {
  amount: number;
  payee: string;
  scheduleId: string;
  scheduleName: string;
};

type ScheduleOccurrencesByAccount = Record<
  string,
  Record<string, ScheduleOccurrenceSummary[]>
>;

type PostedTransactionSummary = {
  startingBalance: number;
  txsByDay: Record<string, number>;
};

export type ForecastDateContext = {
  forecastStartDate: string;
  forecastEndDate: string;
  forecastDays: string[];
  firstForecastDate: string;
  endDateObj: Date;
};

type ProjectForecastDataParams = {
  accounts: AccountWithComputedBalance[];
  transactions: TransactionEntity[];
  futureOccurrences: ForecastScheduleOccurrence[];
  filterInfo: ForecastFilterInfo;
  dateContext: ForecastDateContext;
};

function maxDate(...dates: string[]) {
  return dates.reduce((latest, current) =>
    current > latest ? current : latest,
  );
}

export function buildForecastDateContext(
  startDate: string | undefined,
  endDate: string | undefined,
): ForecastDateContext {
  const today = new Date();
  const forecastStartDate = startDate || format(today, 'yyyy-MM-dd');
  const forecastEndDate = endDate || format(addMonths(today, 12), 'yyyy-MM-dd');
  const todayString = format(today, 'yyyy-MM-dd');

  return {
    forecastStartDate,
    forecastEndDate,
    forecastDays: monthUtils.dayRangeInclusive(
      forecastStartDate,
      forecastEndDate,
    ),
    firstForecastDate:
      forecastEndDate < todayString
        ? forecastStartDate
        : maxDate(forecastStartDate, todayString),
    endDateObj: endDate ? monthUtils.parseDate(endDate) : addMonths(today, 12),
  };
}

export function createEmptyForecastResult(
  forecastStartDate: string,
  forecastEndDate: string,
): ForecastResult {
  return {
    dataPoints: [],
    lowestBalance: {
      date: forecastStartDate,
      balance: 0,
      accountId: '',
      accountName: '',
    },
    forecastStartDate,
    forecastEndDate,
  };
}

function addScheduleOccurrence(
  scheduleOccurrencesByAccount: ScheduleOccurrencesByAccount,
  accountId: string,
  date: string,
  occurrence: ScheduleOccurrenceSummary,
) {
  if (!scheduleOccurrencesByAccount[accountId]) {
    scheduleOccurrencesByAccount[accountId] = {};
  }

  if (!scheduleOccurrencesByAccount[accountId][date]) {
    scheduleOccurrencesByAccount[accountId][date] = [];
  }

  scheduleOccurrencesByAccount[accountId][date].push(occurrence);
}

export function indexScheduleOccurrences(
  futureOccurrences: ForecastScheduleOccurrence[],
  accountIdSet: Set<string>,
  filterInfo: ForecastFilterInfo,
  firstForecastDate: string,
  forecastEndDate: string,
): ScheduleOccurrencesByAccount {
  const scheduleOccurrencesByAccount: ScheduleOccurrencesByAccount = {};

  for (const occurrence of futureOccurrences) {
    if (
      occurrence.transaction.date < firstForecastDate ||
      occurrence.transaction.date > forecastEndDate ||
      !accountIdSet.has(occurrence.transaction.account) ||
      !matchesForecastFilters(occurrence.filterObject, filterInfo)
    ) {
      continue;
    }

    addScheduleOccurrence(
      scheduleOccurrencesByAccount,
      occurrence.transaction.account,
      occurrence.transaction.date,
      {
        amount: occurrence.amount,
        payee: occurrence.payee,
        scheduleId: occurrence.scheduleId,
        scheduleName: occurrence.scheduleName,
      },
    );
  }

  return scheduleOccurrencesByAccount;
}

function groupTransactionsByAccount(transactions: TransactionEntity[]) {
  return transactions.reduce<Map<string, TransactionEntity[]>>(
    (grouped, tx) => {
      const accountTransactions = grouped.get(tx.account);
      if (accountTransactions) {
        accountTransactions.push(tx);
      } else {
        grouped.set(tx.account, [tx]);
      }
      return grouped;
    },
    new Map(),
  );
}

function summarizePostedTransactions(
  accountTransactions: TransactionEntity[],
  forecastStartDate: string,
  forecastEndDate: string,
): PostedTransactionSummary {
  const summary: PostedTransactionSummary = {
    startingBalance: 0,
    txsByDay: {},
  };

  for (const tx of accountTransactions) {
    if (tx.date < forecastStartDate) {
      summary.startingBalance += tx.amount;
      continue;
    }

    if (tx.date > forecastEndDate) {
      continue;
    }

    summary.txsByDay[tx.date] = (summary.txsByDay[tx.date] || 0) + tx.amount;
  }

  return summary;
}

function buildAccountForecastDataPoints(
  account: AccountWithComputedBalance,
  postedTransactions: PostedTransactionSummary,
  scheduleOccurrencesByDay: Record<string, ScheduleOccurrenceSummary[]>,
  forecastDays: string[],
): ForecastDataPoint[] {
  let runningBalance = postedTransactions.startingBalance;

  return forecastDays.map(day => {
    const txDelta = postedTransactions.txsByDay[day] || 0;
    const scheduleTxns = scheduleOccurrencesByDay[day] || [];
    const scheduleDelta = scheduleTxns.reduce((sum, tx) => sum + tx.amount, 0);
    runningBalance += txDelta + scheduleDelta;

    return {
      date: day,
      balance: runningBalance,
      accountId: account.id,
      accountName: account.name,
      transactions: scheduleTxns.map(scheduleTxn => ({
        amount: scheduleTxn.amount,
        payee: scheduleTxn.payee,
        scheduleId: scheduleTxn.scheduleId,
        scheduleName: scheduleTxn.scheduleName,
      })),
    };
  });
}

function calculateLowestBalance(
  dataPoints: ForecastDataPoint[],
  accounts: AccountWithComputedBalance[],
  forecastStartDate: string,
) {
  const combinedByDate: Record<string, number> = {};
  for (const dataPoint of dataPoints) {
    combinedByDate[dataPoint.date] =
      (combinedByDate[dataPoint.date] || 0) + dataPoint.balance;
  }

  let lowestBalance = {
    date: forecastStartDate,
    balance: Infinity,
    accountId: '',
    accountName: '',
  };

  for (const [date, combinedBalance] of Object.entries(combinedByDate)) {
    if (combinedBalance < lowestBalance.balance) {
      lowestBalance = {
        date,
        balance: combinedBalance,
        accountId: '',
        accountName: '',
      };
    }
  }

  if (lowestBalance.balance === Infinity) {
    return {
      date: forecastStartDate,
      balance: accounts.reduce(
        (sum, account) => sum + account.balance_current,
        0,
      ),
      accountId: '',
      accountName: '',
    };
  }

  return lowestBalance;
}

export function projectForecastData({
  accounts,
  transactions,
  futureOccurrences,
  filterInfo,
  dateContext,
}: ProjectForecastDataParams): Pick<
  ForecastResult,
  'dataPoints' | 'lowestBalance'
> {
  const accountIdsToQuery = accounts.map(account => account.id);
  const accountIdSet = new Set(accountIdsToQuery);
  const scheduleOccurrencesByAccount = indexScheduleOccurrences(
    futureOccurrences,
    accountIdSet,
    filterInfo,
    dateContext.firstForecastDate,
    dateContext.forecastEndDate,
  );
  const transactionsByAccount = groupTransactionsByAccount(transactions);
  const dataPoints = accounts.flatMap(account =>
    buildAccountForecastDataPoints(
      account,
      summarizePostedTransactions(
        transactionsByAccount.get(account.id) ?? [],
        dateContext.forecastStartDate,
        dateContext.forecastEndDate,
      ),
      scheduleOccurrencesByAccount[account.id] ?? {},
      dateContext.forecastDays,
    ),
  );

  dataPoints.sort((a, b) => a.date.localeCompare(b.date));

  return {
    dataPoints,
    lowestBalance: calculateLowestBalance(
      dataPoints,
      accounts,
      dateContext.forecastStartDate,
    ),
  };
}
