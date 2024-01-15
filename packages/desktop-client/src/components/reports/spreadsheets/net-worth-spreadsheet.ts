// @ts-strict-ignore
import * as d from 'date-fns';

import { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import {
  integerToCurrency,
  integerToAmount,
  amountToInteger,
} from 'loot-core/src/shared/util';

import { index } from '../util';

export function createSpreadsheet(
  start,
  end,
  accounts,
  conditions = [],
  conditionsOp,
) {
  return async (spreadsheet, setData) => {
    if (accounts.length === 0) {
      return null;
    }

    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const data = await Promise.all(
      accounts.map(async acct => {
        const [starting, balances] = await Promise.all([
          runQuery(
            q('transactions')
              .filter({
                [conditionsOpKey]: filters,
                account: acct.id,
                date: { $lt: start + '-01' },
              })
              .calculate({ $sum: '$amount' }),
          ).then(({ data }) => data),

          runQuery(
            q('transactions')
              .filter({
                [conditionsOpKey]: filters,
              })
              .filter({
                account: acct.id,
                $and: [
                  { date: { $gte: start + '-01' } },
                  { date: { $lte: end + '-31' } },
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
          balances: index(balances, 'date'),
          starting,
        };
      }),
    );

    setData(recalculate(data, start, end));
  };
}

function recalculate(data, start, end) {
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
  let lowestNetWorth = null;
  let highestNetWorth = null;

  const graphData = months.reduce((arr, month, idx) => {
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
    const change = last ? total - amountToInteger(last.y) : 0;

    if (arr.length === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;

    arr.push({
      x: d.format(x, 'MMM ’yy'),
      y: integerToAmount(total),
      assets: integerToCurrency(assets),
      debt: `-${integerToCurrency(debt)}`,
      change: integerToCurrency(change),
      networth: integerToCurrency(total),
      date: d.format(x, 'MMMM yyyy'),
    });

    arr.forEach(item => {
      if (item.y < lowestNetWorth || lowestNetWorth === null) {
        lowestNetWorth = item.y;
      }
      if (item.y > highestNetWorth || highestNetWorth === null) {
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
