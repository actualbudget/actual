import { send } from '@actual-app/core/platform/client/connection';
import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  RuleConditionEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import * as d from 'date-fns';
import type { Locale } from 'date-fns';
import { keyBy } from 'es-toolkit';

import { getIntervalFormat } from '#components/reports/ReportOptions';
import type { AccountBalanceConverter } from '#hooks/useAccountBalanceConverter';
import type { FormatType } from '#hooks/useFormat';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

type Balance = {
  date: string;
  amount: number;
};

type AccountBalanceData = {
  id: string;
  name: string;
  balances: Record<string, Balance>;
  starting: number;
};

type TransferLeg = Pick<
  TransactionEntity,
  'id' | 'account' | 'amount' | 'date'
> & {
  transfer_id: string;
};

type IntervalRange = {
  startDate: string;
  endDate: string;
  interval: string;
  firstDayOfWeekIdx: string;
};

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
  dateFormat?: string,
  {
    convertBalance,
    defaultCurrencyCode = '',
  }: {
    // Values balances of accounts in other currencies in the default one;
    // null while the exchange rates are still loading
    convertBalance?: AccountBalanceConverter | null;
    // The currency of accounts without one of their own
    defaultCurrencyCode?: string;
  } = {},
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof recalculate>) => void,
  ) => {
    // Nothing is shown until the rates are known, rather than first
    // adding all currencies up 1:1
    if (convertBalance === null) {
      return;
    }

    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    // Go back exactly one interval before the selected range start
    // to get the correct starting balance for the first period
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
      // Monthly or yearly
      startDate = monthUtils.firstDayOfMonth(monthUtils.prevMonth(start));
    }

    // If the earliest transaction is on or after the first day of the start
    // month, the prior period lookback would be empty (all zeros). Skip it to
    // avoid rendering an empty data point.
    const earliestTransaction = await send('get-earliest-transaction');
    if (
      earliestTransaction &&
      earliestTransaction.date >= monthUtils.firstDayOfMonth(start)
    ) {
      if (interval === 'Daily') {
        startDate = earliestTransaction.date;
      } else if (interval === 'Weekly') {
        startDate = monthUtils.weekFromDate(
          earliestTransaction.date,
          firstDayOfWeekIdx,
        );
      } else {
        // Monthly or Yearly
        startDate = monthUtils.firstDayOfMonth(start);
      }
    }

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

    const accountIds = accounts.map(account => account.id);
    const transferLegsPromise =
      accountIds.length === 0
        ? Promise.resolve<TransferLeg[]>([])
        : aqlQuery(
            q('transactions')
              .filter({
                [conditionsOpKey]: filters,
              })
              .filter({
                account: { $oneof: accountIds },
                transfer_id: { $ne: null },
                date: { $lte: endDate },
              })
              .select(['id', 'account', 'amount', 'date', 'transfer_id']),
          ).then(({ data }: { data: TransferLeg[] }) => data);

    const accountDataPromise = Promise.all(
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
          processedBalances = keyBy(balances, b => b.date);
        }

        return {
          id: acct.id,
          name: acct.name,
          balances: processedBalances,
          starting,
        };
      }),
    );
    const [data, transferLegs] = await Promise.all([
      accountDataPromise,
      transferLegsPromise,
    ]);

    const loadedTransferIds = new Set(transferLegs.map(leg => leg.id));
    const missingCounterpartIds = [
      ...new Set(
        transferLegs
          .map(leg => leg.transfer_id)
          .filter(id => !loadedTransferIds.has(id)),
      ),
    ];

    let allTransferLegs = transferLegs;
    if (missingCounterpartIds.length > 0) {
      const counterpartLegs: TransferLeg[] = await aqlQuery(
        q('transactions')
          .filter({
            [conditionsOpKey]: filters,
          })
          .filter({
            id: { $oneof: missingCounterpartIds },
            account: { $oneof: accountIds },
            transfer_id: { $ne: null },
          })
          .select(['id', 'account', 'amount', 'date', 'transfer_id']),
      ).then(({ data }: { data: TransferLeg[] }) => data);
      allTransferLegs = [...transferLegs, ...counterpartLegs];
    }

    // Prevent paired internal transfers from changing net worth between their
    // two posting dates. Transfers only have a side in another currency
    // while balances in other currencies are converted.
    alignInternalTransferDates(
      data,
      allTransferLegs,
      {
        startDate,
        endDate,
        interval,
        firstDayOfWeekIdx,
      },
      convertBalance
        ? new Map(
            accounts.map(account => [
              account.id,
              getEffectiveCurrency(account.currency, defaultCurrencyCode),
            ]),
          )
        : null,
    );

    setData(
      recalculate(
        data,
        startDate,
        endDate,
        locale,
        interval,
        firstDayOfWeekIdx,
        format,
        dateFormat,
        convertBalance,
      ),
    );
  };
}

// The last day an interval covers; balances are valued on that day
function getIntervalEndDate(
  intervalItem: string,
  interval: string,
  endDate: string,
): string {
  let end: string;
  if (interval === 'Daily') {
    end = intervalItem;
  } else if (interval === 'Weekly') {
    end = monthUtils.addDays(intervalItem, 6);
  } else if (interval === 'Yearly') {
    end = `${intervalItem}-12-31`;
  } else {
    end = monthUtils.lastDayOfMonth(intervalItem);
  }
  return end > endDate ? endDate : end;
}

function alignInternalTransferDates(
  data: AccountBalanceData[],
  transferLegs: TransferLeg[],
  range: IntervalRange,
  // Null while all accounts count in one currency
  currencyByAccount: ReadonlyMap<string, string> | null,
) {
  const accountsById = new Map(data.map(account => [account.id, account]));
  const transfersById = new Map(transferLegs.map(leg => [leg.id, leg]));
  const processed = new Set<string>();

  transferLegs.forEach(leg => {
    if (processed.has(leg.id)) {
      return;
    }

    const counterpart = transfersById.get(leg.transfer_id);
    // Between currencies each side keeps its own amount, so only the signs
    // are opposite
    const isCrossCurrency =
      counterpart !== undefined &&
      currencyByAccount !== null &&
      currencyByAccount.get(leg.account) !==
        currencyByAccount.get(counterpart.account);
    if (
      !counterpart ||
      counterpart.transfer_id !== leg.id ||
      counterpart.account === leg.account ||
      (isCrossCurrency
        ? Math.sign(counterpart.amount) !== -Math.sign(leg.amount)
        : counterpart.amount + leg.amount !== 0) ||
      !accountsById.has(leg.account) ||
      !accountsById.has(counterpart.account)
    ) {
      return;
    }

    processed.add(leg.id);
    processed.add(counterpart.id);

    if (leg.date === counterpart.date) {
      return;
    }

    const [earlier, later] =
      leg.date < counterpart.date ? [leg, counterpart] : [counterpart, leg];

    const account = accountsById.get(earlier.account);
    if (account) {
      moveTransferLeg(account, earlier, later.date, range);
    }
  });
}

function moveTransferLeg(
  account: AccountBalanceData,
  leg: TransferLeg,
  laterDate: string,
  range: IntervalRange,
) {
  const { startDate, endDate, interval, firstDayOfWeekIdx } = range;
  if (laterDate < startDate) {
    return;
  }

  if (leg.date < startDate) {
    account.starting -= leg.amount;
  } else {
    if (leg.date > endDate) {
      return;
    }
    const originalKey = getIntervalKey(leg.date, interval, firstDayOfWeekIdx);
    const originalBalance = account.balances[originalKey];
    if (!originalBalance) {
      return;
    }
    originalBalance.amount -= leg.amount;
  }

  if (laterDate > endDate) {
    return;
  }

  const intervalKey = getIntervalKey(laterDate, interval, firstDayOfWeekIdx);
  const balance = account.balances[intervalKey];
  if (balance) {
    balance.amount += leg.amount;
  } else {
    account.balances[intervalKey] = { date: intervalKey, amount: leg.amount };
  }
}

function getIntervalKey(
  date: string,
  interval: string,
  firstDayOfWeekIdx: string,
) {
  if (interval === 'Daily') {
    return date;
  }
  if (interval === 'Weekly') {
    return monthUtils.weekFromDate(date, firstDayOfWeekIdx);
  }
  if (interval === 'Yearly') {
    return date.slice(0, 4);
  }
  return monthUtils.getMonth(date);
}

function recalculate(
  data: AccountBalanceData[],
  startDate: string,
  endDate: string,
  locale: Locale,
  interval: string = 'Monthly',
  firstDayOfWeekIdx: string = '0',
  format: (value: unknown, type?: FormatType) => string,
  dateFormat?: string,
  convertBalance?: AccountBalanceConverter,
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

  // Balances of accounts in other currencies are valued in the default
  // currency on the last day of each interval
  let hasApproximateConversion = false;
  const toDefaultCurrency = (
    amount: number,
    accountId: string,
    date: string,
  ) => {
    // A zero balance is zero in every currency, so it is never approximate
    if (!convertBalance || amount === 0) {
      return amount;
    }
    const converted = convertBalance(amount, accountId, date);
    hasApproximateConversion =
      hasApproximateConversion || converted.isApproximate;
    return converted.amount;
  };

  const accountBalances = data.map(account => {
    let balance = account.starting;
    return intervals.map(intervalItem => {
      if (account.balances[intervalItem]) {
        balance += account.balances[intervalItem].amount;
      }
      return toDefaultCurrency(
        balance,
        account.id,
        getIntervalEndDate(intervalItem, interval, endDate),
      );
    });
  });

  const priorPeriodNetWorth = data.reduce(
    (sum, account) =>
      sum +
      toDefaultCurrency(
        account.starting,
        account.id,
        monthUtils.subDays(startDate, 1),
      ),
    0,
  );

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

    const change = last ? total - last.y : total - priorPeriodNetWorth;

    if (arr.length === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;

    // Use standardized format from ReportOptions, following the user's date
    // format preference for the day-level intervals.
    const displayFormat = getIntervalFormat(interval, dateFormat) || "MMM ''yy";

    const tooltipFormat =
      interval === 'Daily'
        ? 'MMMM d, yyyy'
        : interval === 'Weekly'
          ? 'MMM d, yyyy'
          : interval === 'Yearly'
            ? 'yyyy'
            : 'MMMM yyyy';

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
    // Some balances used a rate from a later date, or counted 1:1 for lack
    // of a rate
    hasApproximateConversion,
    lowestNetWorth,
    highestNetWorth,
    accounts: data
      .filter((_, i) => hasBalance[i])
      .map(d => ({ id: d.id, name: d.name })),
  };
}
