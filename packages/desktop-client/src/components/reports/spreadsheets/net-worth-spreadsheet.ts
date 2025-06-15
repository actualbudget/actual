import * as d from 'date-fns';
import { type Locale } from 'date-fns';
import keyBy from 'lodash/keyBy';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  type AccountEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { type FormatType } from '@desktop-client/components/spreadsheet/useFormat';
import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type Balance = {
  date: string;
  amount: number;
};

export function createSpreadsheet(
  start: string,
  end: string,
  accounts: AccountEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  locale: Locale,
  format: (value: unknown, type?: FormatType) => string,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof recalculate>) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const data = await Promise.all(
      accounts.map(async acct => {
        const [starting, balances]: [number, Balance[]] = await Promise.all([
          aqlQuery(
            q('transactions')
              .filter({
                [conditionsOpKey]: filters,
                account: acct.id,
                date: { $lt: monthUtils.firstDayOfMonth(start) },
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
                  { date: { $gte: monthUtils.firstDayOfMonth(start) } },
                  { date: { $lte: monthUtils.lastDayOfMonth(end) } },
                ],
              })
              .groupBy({ $month: '$date' })
              .select([
                { date: { $month: '$date' } },
                { amount: { $sum: '$amount' } },
              ]),
          ).then(({ data }) => data),
        ]);

        return {
          id: acct.id,
          balances: keyBy(balances, 'date'),
          starting,
        };
      }),
    );

    setData(recalculate(data, start, end, locale, format));
  };
}

function recalculate(
  data: Array<{
    id: string;
    balances: Record<string, Balance>;
    starting: number;
  }>,
  start: string,
  end: string,
  locale: Locale,
  format: (value: unknown, type?: FormatType) => string,
) {
  const months = monthUtils.rangeInclusive(start, end);

  const accountBalances = data.map(account => {
    // Start off with the balance at that point in time
    let balance = account.starting;
    return months.map(month => {
      if (account.balances[month]) {
        balance += account.balances[month].amount;
      }
      return balance;
    });
  });

  let hasNegative = false;
  let startNetWorth = 0;
  let endNetWorth = 0;
  let lowestNetWorth: number | null = null;
  let highestNetWorth: number | null = null;

  const graphData = months.reduce<
    Array<{
      x: string;
      y: number;
      assets: string;
      debt: string;
      change: string;
      networth: string;
      date: string;
    }>
  >((arr, month, idx) => {
    let debt = 0;
    let assets = 0;
    let total = 0;
    const last = arr.length === 0 ? null : arr[arr.length - 1];

    accountBalances.forEach(balances => {
      const balance = balances[idx];
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

    const x = d.parseISO(month + '-01');
    const change = last ? total - last.y : 0;

    if (arr.length === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;

    arr.push({
      x: d.format(x, 'MMM ’yy', { locale }),
      y: total,
      assets: format(assets, 'financial'),
      debt: `-${format(debt, 'financial')}`,
      change: format(change, 'financial'),
      networth: format(total, 'financial'),
      date: d.format(x, 'MMMM yyyy', { locale }),
    });

    arr.forEach(item => {
      if (lowestNetWorth === null || item.y < lowestNetWorth) {
        lowestNetWorth = item.y;
      }
      if (highestNetWorth === null || item.y > highestNetWorth) {
        highestNetWorth = item.y;
      }
    });
    return arr;
  }, []);

  return {
    graphData: {
      data: graphData,
      hasNegative,
      start,
      end,
    },
    netWorth: endNetWorth,
    totalChange: endNetWorth - startNetWorth,
    lowestNetWorth,
    highestNetWorth,
  };
}
