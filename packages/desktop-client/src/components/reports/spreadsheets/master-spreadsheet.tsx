import React from 'react';

import * as d from 'date-fns';

import q from 'loot-core/src/client/query-helpers';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  integerToCurrency,
  integerToAmount,
  amountToInteger,
} from 'loot-core/src/shared/util';

import AlignedText from '../../common/AlignedText';
import { fromDateRepr, fromDateReprToDay, runAll, index } from '../util';

export function masterDataSpreadsheet(
  start,
  end,
  isConcise,
  selectList,
  filt,
  categories,
  reportPage,
) {
  return async (spreadsheet, setData) => {
    function makeCategoryQuery(where) {
      let query = q('transactions').filter({
        $and: [
          { date: { $transform: '$month', $gte: start } },
          { date: { $transform: '$month', $lte: end } },
          reportPage === 'IE' &&
            selectList !== 'All' && {
              'category.is_income': selectList === 'Income' ? true : false,
            },
          reportPage !== 'NetWorth' && { 'account.offbudget': false },
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
      return query
        .groupBy('category.name')
        .select([
          { category: 'category.name' },
          { amount: { $sum: '$amount' } },
        ]);
    }

    function makeDateQuery(where) {
      let query = q('transactions').filter({
        $and: [
          { date: { $transform: '$month', $gte: start } },
          { date: { $transform: '$month', $lte: end } },
          reportPage === 'IE' &&
            selectList !== 'All' && {
              'category.is_income': selectList === 'Income' ? true : false,
            },
          reportPage !== 'NetWorth' && { 'account.offbudget': false },
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
        return query
          .groupBy({ $month: '$date' })
          .select([
            { date: { $month: '$date' } },
            { amount: { $sum: '$amount' } },
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
            $and: [
              { date: { $transform: '$month', $lt: start } },
              reportPage !== 'NetWorth' && { 'account.offbudget': false },
            ],
          })
          .calculate({ $sum: '$amount' }),
        makeDateQuery('amount > 0').filter({ amount: { $gt: 0 } }),
        makeDateQuery('amount < 0').filter({ amount: { $lt: 0 } }),
        q('transactions')
          .filter({
            $and: [
              { date: { $transform: '$month', $lte: start } },
              { amount: { $gt: 0 } },
              reportPage !== 'NetWorth' && { 'account.offbudget': false },
            ],
          })
          .calculate({ $sum: '$amount' }),
        q('transactions')
          .filter({
            $and: [
              { date: { $transform: '$month', $lte: start } },
              { amount: { $lt: 0 } },
              reportPage !== 'NetWorth' && { 'account.offbudget': false },
            ],
          })
          .calculate({ $sum: '$amount' }),
        makeCategoryQuery('amount > 0').filter({ amount: { $gt: 0 } }),
        makeCategoryQuery('amount < 0').filter({ amount: { $lt: 0 } }),
      ],
      data => {
        setData(
          recalculateDate(
            data,
            start,
            end,
            isConcise,
            selectList,
            categories,
            reportPage,
          ),
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
  selectList,
  categories,
  reportPage,
) {
  let [
    startingBalance,
    incomeDate,
    expenseDate,
    startingAssets,
    startingDebts,
    incomeCategory,
    expenseCategory,
  ] = data;

  const incomeCat = index(incomeCategory, 'category');

  const expenseCat = index(expenseCategory, 'category');

  const category = categories.list.map(q => {
    return q.name;
  });

  const catData = category.reduce(
    (res, elem) => {
      let expense = 0;
      let income = 0;

      income = incomeCat[elem] ? incomeCat[elem].amount : 0;
      expense = expenseCat[elem]
        ? expenseCat[elem].amount *
          (reportPage === 'IE' && selectList === 'Expense' ? -1 : 1)
        : 0;

      const x = elem;

      if (income !== 0) {
        res.income.push({
          x,
          y: integerToAmount(income),
          q: integerToCurrency(income),
          income: integerToCurrency(income),
          expenses: integerToCurrency(expense),
        });
      }
      if (expense !== 0) {
        res.expenses.push({
          x,
          y: integerToAmount(expense),
          q: integerToCurrency(expense),
          income: integerToCurrency(income),
          expenses: integerToCurrency(expense),
        });
      }

      return res;
    },
    { expenses: [], income: [] },
  );

  const dates = isConcise
    ? monthUtils.rangeInclusive(
        monthUtils.getMonth(start),
        monthUtils.getMonth(end),
      )
    : monthUtils.dayRangeInclusive(start, end);

  const incomes = index(
    incomeDate,
    'date',
    isConcise ? fromDateRepr : fromDateReprToDay,
  );

  const expenses = index(
    expenseDate,
    'date',
    isConcise ? fromDateRepr : fromDateReprToDay,
  );

  let balance = reportPage === 'IE' ? 0 : startingBalance;
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
      expense = expenses[date] ? expenses[date].amount : 0;

      totalExpenses += expense;
      totalIncome += income;
      balance += income + expense;

      debt += expense;
      assets += income;

      if (balance < 0) {
        hasNegative = true;
      }

      const x = d.parseISO(date);

      /*if (res.length === 0) {
        startNetWorth = balance;
      }*/

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
        isConcise,
        x,
        reportPage,
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
    catData,
    totalExpenses,
    totalIncome,
    hasNegative,
    netWorth: endNetWorth,
    totalChanges: endNetWorth - startNetWorth,
    startNetWorth,
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
  isConcise,
  x,
  reportPage,
) {
  if (reportPage === 'NetWorth') {
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
  } else if (reportPage === 'CashFlow') {
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
  } else if (reportPage === 'IE') {
    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>{d.format(x, 'MMMM yyyy')}</strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          {income ? (
            <AlignedText left="Income:" right={integerToCurrency(income)} />
          ) : null}
          {expense ? (
            <AlignedText left="Expenses:" right={integerToCurrency(expense)} />
          ) : null}
        </div>
      </div>
    );
  }
}
