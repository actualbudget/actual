import React from 'react';

import * as d from 'date-fns';

import q from 'loot-core/src/client/query-helpers';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency, integerToAmount } from 'loot-core/src/shared/util';
import { AlignedText } from 'loot-design/src/components/common';

import { fromDateRepr, fromDateReprToDay, runAll, index } from '../util';

export function simpleCashFlow(start, end) {
  return async (spreadsheet, setData) => {
    function makeQuery() {
      return q('transactions')
        .filter({
          $and: [{ date: { $gte: start } }, { date: { $lte: end } }],
          'account.offbudget': false,
          $or: [
            {
              'payee.transfer_acct.offbudget': true,
              'payee.transfer_acct': null
            }
          ]
        })
        .calculate({ $sum: '$amount' });
    }

    return runAll(
      [
        makeQuery().filter({ amount: { $gt: 0 } }),
        makeQuery().filter({ amount: { $lt: 0 } })
      ],
      data => {
        setData({
          graphData: {
            income: data[0],
            expense: data[1]
          }
        });
      }
    );
  };
}

export function cashFlowByDate(start, end, isConcise) {
  return async (spreadsheet, setData) => {
    function makeQuery(where) {
      let query = q('transactions').filter({
        $and: [
          { date: { $transform: '$month', $gte: start } },
          { date: { $transform: '$month', $lte: end } }
        ],
        'account.offbudget': false,
        $or: [
          {
            'payee.transfer_acct.offbudget': true,
            'payee.transfer_acct': null
          }
        ]
      });

      if (isConcise) {
        return query
          .groupBy({ $month: '$date' })
          .select([
            { date: { $month: '$date' } },
            { amount: { $sum: '$amount' } }
          ]);
      }

      return query
        .groupBy('date')
        .select(['date', { amount: { $sum: '$amount' } }]);
    }

    return runAll(
      [
        q('transactions')
          .filter({
            date: { $transform: '$month', $lt: start },
            'account.offbudget': false
          })
          .calculate({ $sum: '$amount' }),
        makeQuery('amount > 0').filter({ amount: { $gt: 0 } }),
        makeQuery('amount < 0').filter({ amount: { $lt: 0 } })
      ],
      data => {
        setData(recalculate(data, start, end, isConcise));
      }
    );
  };
}

function recalculate(data, start, end, isConcise) {
  let [startingBalance, income, expense] = data;
  const dates = isConcise
    ? monthUtils.rangeInclusive(
        monthUtils.getMonth(start),
        monthUtils.getMonth(end)
      )
    : monthUtils.dayRangeInclusive(start, end);
  const incomes = index(
    income,
    'date',
    isConcise ? fromDateRepr : fromDateReprToDay
  );
  const expenses = index(
    expense,
    'date',
    isConcise ? fromDateRepr : fromDateReprToDay
  );

  let balance = startingBalance;
  let totalExpenses = 0;
  let totalIncome = 0;
  const graphData = dates.reduce(
    (res, date) => {
      let income = 0;
      let expense = 0;

      if (incomes[date]) {
        income = incomes[date].amount;
      }
      if (expenses[date]) {
        expense = expenses[date].amount;
      }

      totalExpenses += expense;
      totalIncome += income;
      balance += income + expense;
      const x = d.parseISO(date);

      const label = (
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>
              {d.format(x, isConcise ? 'MMMM yyyy' : 'MMMM d, yyyy')}
            </strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <AlignedText left="Income:" right={integerToCurrency(income)} />
            <AlignedText left="Expenses:" right={integerToCurrency(expense)} />
            <AlignedText
              left="Change:"
              right={<strong>{integerToCurrency(income + expense)}</strong>}
            />
            <AlignedText left="Balance:" right={integerToCurrency(balance)} />
          </div>
        </div>
      );

      res.income.push({ x, y: integerToAmount(income) });
      res.expenses.push({ x, y: integerToAmount(expense) });
      res.balances.push({
        x,
        y: integerToAmount(balance),
        premadeLabel: label,
        amount: balance
      });
      return res;
    },
    { expenses: [], income: [], balances: [] }
  );

  const { balances } = graphData;

  return {
    graphData,
    balance: balances[balances.length - 1].amount,
    totalExpenses,
    totalIncome,
    totalChange: balances[balances.length - 1].amount - balances[0].amount
  };
}
