import React from 'react';

import * as d from 'date-fns';

import q, { runQuery } from 'loot-core/src/client/query-helpers';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  integerToCurrency,
  integerToAmount,
  amountToInteger
} from 'loot-core/src/shared/util';
import { AlignedText } from 'loot-design/src/components/common';

import { index } from '../util';

export default function createSpreadsheet(start, end, accounts) {
  return async (spreadsheet, setData) => {
    if (accounts.length === 0) {
      return null;
    }

    const data = await Promise.all(
      accounts.map(async acct => {
        let [starting, balances] = await Promise.all([
          runQuery(
            q('transactions')
              .filter({ account: acct.id, date: { $lt: start + '-01' } })
              .calculate({ $sum: '$amount' })
          ).then(({ data }) => data),

          runQuery(
            q('transactions')
              .filter({
                account: acct.id,
                $and: [
                  { date: { $gte: start + '-01' } },
                  { date: { $lte: end + '-31' } }
                ]
              })
              .groupBy({ $month: '$date' })
              .select([
                { date: { $month: '$date' } },
                { amount: { $sum: '$amount' } }
              ])
          ).then(({ data }) => data)
        ]);

        return {
          id: acct.id,
          balances: index(balances, 'date'),
          starting
        };
      })
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

    const label = (
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>{d.format(x, 'MMMM yyyy')}</strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          <AlignedText left="Assets:" right={integerToCurrency(assets)} />
          <AlignedText left="Debt:" right={`-${integerToCurrency(debt)}`} />
          <AlignedText
            left="Net worth:"
            right={<strong>{integerToCurrency(total)}</strong>}
          />
          <AlignedText left="Change:" right={integerToCurrency(change)} />
        </div>
      </div>
    );

    if (arr.length === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;

    arr.push({ x, y: integerToAmount(total), premadeLabel: label });
    return arr;
  }, []);

  return {
    graphData: {
      data: graphData,
      hasNegative,
      start,
      end
    },
    netWorth: endNetWorth,
    totalChange: endNetWorth - startNetWorth
  };
}
