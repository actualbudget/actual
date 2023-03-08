import React from 'react';

import * as d from 'date-fns';

import q from 'loot-core/src/client/query-helpers';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  integerToCurrency,
  integerToAmount,
  amountToInteger,
} from 'loot-core/src/shared/util';
import { AlignedText } from 'loot-design/src/components/common';

import { fromDateRepr, fromDateReprToDay, runAll, index } from '../util';

export function masterDataSpreadsheet(
  start,
  end,
  endDay,
  isTotals,
  isConcise,
  selectList,
  isCashFlow,
  isNetWorth,
  isIE,
  filt,
) {
  return async (spreadsheet, setData) => {
    function makeQuery(where) {
      let query = q('transactions').filter({
        $and: [
          { date: { $transform: '$month', $gte: start } },
          { date: { $transform: '$month', $lte: endDay } },
          isIE &&
            selectList !== 'All' && {
              'category.is_income': selectList === 'Income' ? true : false,
            },
          !isNetWorth && { 'account.offbudget': false },
        ],
        $or: [
          {
            'payee.transfer_acct.offbudget': true,
            'payee.transfer_acct': null,
          },
        ],
      });

      if (filt.length > 0) {
        query = query.filter({
          $and: [...filt],
        });
      }

      if (isConcise) {
        if (isTotals) {
          return query
            .groupBy('category.name')
            .select([
              { category: 'category.name' },
              { amount: { $sum: '$amount' } },
            ]);
        } else {
          return query
            .groupBy({ $month: '$date' })
            .select([
              { date: { $month: '$date' } },
              { amount: { $sum: '$amount' } },
            ]);
        }
      }

      return query
        .groupBy('date')
        .select(['date', { amount: { $sum: '$amount' } }]);
    }

    return runAll(
      [
        q('transactions')
          .filter({
            $and: [
              { date: { $transform: '$month', $lt: start } },
              !isNetWorth && { 'account.offbudget': false },
            ],
          })
          .calculate({ $sum: '$amount' }),
        makeQuery('amount > 0').filter({ amount: { $gt: 0 } }),
        makeQuery('amount < 0').filter({ amount: { $lt: 0 } }),
        q('transactions')
          .filter({
            $and: [
              { date: { $transform: '$month', $lte: start } },
              { amount: { $gt: 0 } },
              !isNetWorth && { 'account.offbudget': false },
            ],
          })
          .calculate({ $sum: '$amount' }),
        q('transactions')
          .filter({
            $and: [
              { date: { $transform: '$month', $lte: start } },
              { amount: { $lt: 0 } },
              !isNetWorth && { 'account.offbudget': false },
            ],
          })
          .calculate({ $sum: '$amount' }),
      ],
      data => {
        setData(
          !isTotals
            ? recalculateDate(
                data,
                start,
                end,
                isConcise,
                isCashFlow,
                isNetWorth,
                isIE,
                selectList,
              )
            : recalculateCategory(data, start, end),
        );
      },
    );
  };
}

function recalculateDate(
  data,
  start,
  end,
  isConcise,
  isCashFlow,
  isNetWorth,
  isIE,
  selectList,
) {
  let [startingBalance, income, expense, startingAssets, startingDebts] = data;

  const dates = isConcise
    ? monthUtils.rangeInclusive(
        monthUtils.getMonth(start),
        monthUtils.getMonth(end),
      )
    : monthUtils.dayRangeInclusive(start, end);

  const incomes = index(
    income,
    'date',
    isConcise ? fromDateRepr : fromDateReprToDay,
  );

  const expenses = index(
    expense,
    'date',
    isConcise ? fromDateRepr : fromDateReprToDay,
  );

  let balance = !(isCashFlow || isNetWorth) ? 0 : startingBalance;
  let totalExpenses = 0;
  let totalIncome = 0;
  let debt = startingDebts;
  let assets = startingAssets;
  let hasNegative = false;
  let startNetWorth = debt + assets;
  let endNetWorth = 0;

  const graphData = dates.reduce(
    (res, date) => {
      let income = 0;
      let expense = 0;

      const last =
        res.balances.length === 0
          ? null
          : res.balances[res.balances.length - 1];

      income = incomes[date] ? incomes[date].amount : 0;
      expense = expenses[date]
        ? expenses[date].amount * (isIE && selectList === 'Expense' ? -1 : 1)
        : 0;

      totalExpenses += expense;
      totalIncome += income;
      balance += income + expense;

      debt += expense;
      assets += income;

      if (balance < 0) {
        hasNegative = true;
      }

      const x = d.parseISO(date);

      if (res.length === 0) {
        startNetWorth = balance;
      }
      endNetWorth = balance;

      const change = last ? balance - amountToInteger(last.y) : 0;

      const label = ChangeLabel(
        income,
        expense,
        balance,
        assets,
        debt,
        change,
        totalExpenses,
        totalIncome,
        isCashFlow,
        isNetWorth,
        isIE,
        isConcise,
        x,
      );

      res.income.push({ x, y: integerToAmount(income), premadeLabel: label });
      res.expenses.push({
        x,
        y: integerToAmount(expense),
        premadeLabel: label,
      });
      res.change.push({
        x,
        y: integerToAmount(expense + income),
        premadeLabel: label,
      });
      res.balances.push({
        x,
        y: integerToAmount(balance),
        premadeLabel: label,
      });
      return res;
    },
    { expenses: [], income: [], change: [], balances: [] },
  );

  return {
    graphData,
    totalExpenses,
    totalIncome,
    hasNegative,
    netWorth: endNetWorth,
    totalChanges: endNetWorth - startNetWorth,
    startNetWorth,
  };
}

function recalculateCategory(data, start, end) {
  let [startingBalance, income, expense] = data;

  //const incomes = index(income, 'category');

  //const expenses = index(expense, 'category');

  let totalExpenses = 0;
  let totalIncome = 0;

  let res = { expenses: [], income: [], change: [], balances: [] };

  expense.forEach(elem => {
    let expensez = 0;

    if (elem.amount) {
      expensez = elem.amount;
    }

    totalExpenses += expensez;

    const x = elem.category;

    const label = (
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>{x}</strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          <AlignedText left="Exp:" right={integerToCurrency(expensez)} />
        </div>
      </div>
    );

    res.expenses.push({
      x,
      y: Math.abs(integerToAmount(elem.amount)),
      premadeLabel: label,
    });
  });

  income.forEach(elem => {
    let incom = 0;

    if (elem.amount) {
      incom = elem.amount;
    }

    totalIncome += incom;

    const x = elem.category;

    const label = (
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>{x}</strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          <AlignedText left="Exp:" right={integerToCurrency(incom)} />
        </div>
      </div>
    );

    res.income.push({
      x,
      y: Math.abs(integerToAmount(elem.amount)),
      premadeLabel: label,
    });
  });

  let myDataExp = res.expenses
    .sort((a, b) => (a.x > b.x ? 1 : -1))
    .map((item, i) => (
      <div key={i}>
        {' '}
        {item.x} {item.y}
      </div>
    ));

  let myDataInc = res.income
    .sort((a, b) => (a.x > b.x ? 1 : -1))
    .map((item, i) => (
      <div key={i}>
        {' '}
        {item.x} {item.y}
      </div>
    ));

  console.log(startingBalance);
  console.log(myDataExp);
  console.log(myDataInc);

  return {
    graphData: {
      expenses: res.expenses,
      income: res.income,
    },
    totalExpenses,
    totalIncome,
  };
}

function ChangeLabel(
  income,
  expense,
  balance,
  assets,
  debt,
  change,
  totalExpenses,
  totalIncome,
  isCashFlow,
  isNetWorth,
  isIE,
  isConcise,
  x,
) {
  if (isNetWorth) {
    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>{d.format(x, 'MMMM yyyy')}</strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          <AlignedText left="Assets:" right={integerToCurrency(assets)} />
          <AlignedText left="Debt:" right={integerToCurrency(debt)} />
          <AlignedText
            left="Net worth:"
            right={<strong>{integerToCurrency(balance)}</strong>}
          />
          <AlignedText left="Change:" right={integerToCurrency(change)} />
        </div>
      </div>
    );
  } else if (isCashFlow) {
    return (
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
  } else if (isIE) {
    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>{d.format(x, 'MMMM yyyy')}</strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          {income ? (
            <AlignedText left="Income:" right={integerToCurrency(income)} />
          ) : (
            ''
          )}
          {expense ? (
            <AlignedText left="Expenses:" right={integerToCurrency(expense)} />
          ) : (
            ''
          )}
        </div>
      </div>
    );
  }
}
