import React from 'react';

import * as d from 'date-fns';

import { type useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import { integerToCurrency, integerToAmount } from 'loot-core/src/shared/util';
import { type RuleConditionEntity } from 'loot-core/types/models';

import { AlignedText } from '../../common/AlignedText';
import { runAll, indexCashFlow } from '../util';

export function simpleCashFlow(
  startMonth: string,
  endMonth: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
) {
  const start = monthUtils.firstDayOfMonth(startMonth);
  const end = monthUtils.lastDayOfMonth(endMonth);

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: { graphData: { income: number; expense: number } }) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    function makeQuery() {
      return q('transactions')
        .filter({
          [conditionsOpKey]: filters,
          $and: [
            { date: { $gte: start } },
            {
              date: {
                $lte:
                  end > monthUtils.currentDay() ? monthUtils.currentDay() : end,
              },
            },
          ],
          'account.offbudget': false,
          'payee.transfer_acct': null,
        })
        .calculate({ $sum: '$amount' });
    }

    return runAll(
      [
        makeQuery().filter({ amount: { $gt: 0 } }),
        makeQuery().filter({ amount: { $lt: 0 } }),
      ],
      data => {
        setData({
          graphData: {
            income: data[0],
            expense: data[1],
          },
        });
      },
    );
  };
}

export function cashFlowByDate(
  startMonth: string,
  endMonth: string,
  isConcise: boolean,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or',
) {
  const start = monthUtils.firstDayOfMonth(startMonth);
  const end = monthUtils.lastDayOfMonth(endMonth);
  const fixedEnd =
    end > monthUtils.currentDay() ? monthUtils.currentDay() : end;

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof recalculate>) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    function makeQuery() {
      const query = q('transactions')
        .filter({
          [conditionsOpKey]: filters,
        })
        .filter({
          $and: [
            { date: { $transform: '$month', $gte: start } },
            { date: { $transform: '$month', $lte: fixedEnd } },
          ],
          'account.offbudget': false,
        });

      if (isConcise) {
        return query
          .groupBy([{ $month: '$date' }, 'payee.transfer_acct'])
          .select([
            { date: { $month: '$date' } },
            { isTransfer: 'payee.transfer_acct' },
            { amount: { $sum: '$amount' } },
          ]);
      }

      return query
        .groupBy(['date', 'payee.transfer_acct'])
        .select([
          'date',
          { isTransfer: 'payee.transfer_acct' },
          { amount: { $sum: '$amount' } },
        ]);
    }

    return runAll(
      [
        q('transactions')
          .filter({
            [conditionsOpKey]: filters,
            date: { $transform: '$month', $lt: start },
            'account.offbudget': false,
          })
          .calculate({ $sum: '$amount' }),
        makeQuery().filter({ amount: { $gt: 0 } }),
        makeQuery().filter({ amount: { $lt: 0 } }),
      ],
      data => {
        setData(recalculate(data, start, fixedEnd, isConcise));
      },
    );
  };
}

function recalculate(
  data: [
    number,
    Array<{ date: string; isTransfer: string | null; amount: number }>,
    Array<{ date: string; isTransfer: string | null; amount: number }>,
  ],
  start: string,
  end: string,
  isConcise: boolean,
) {
  const [startingBalance, income, expense] = data;
  const convIncome = income.map(t => {
    return { ...t, isTransfer: t.isTransfer !== null };
  });
  const convExpense = expense.map(t => {
    return { ...t, isTransfer: t.isTransfer !== null };
  });
  const dates = isConcise
    ? monthUtils.rangeInclusive(
        monthUtils.getMonth(start),
        monthUtils.getMonth(end),
      )
    : monthUtils.dayRangeInclusive(start, end);
  const incomes = indexCashFlow(convIncome);
  const expenses = indexCashFlow(convExpense);

  let balance = startingBalance;
  let totalExpenses = 0;
  let totalIncome = 0;
  let totalTransfers = 0;

  const graphData = dates.reduce<{
    expenses: Array<{ x: Date; y: number }>;
    income: Array<{ x: Date; y: number }>;
    transfers: Array<{ x: Date; y: number }>;
    balances: Array<{
      x: Date;
      y: number;
      premadeLabel: JSX.Element;
      amount: number;
    }>;
  }>(
    (res, date) => {
      let income = 0;
      let expense = 0;
      let creditTransfers = 0;
      let debitTransfers = 0;

      if (incomes[date]) {
        income = !incomes[date].false ? 0 : incomes[date].false;
        creditTransfers = !incomes[date].true ? 0 : incomes[date].true;
      }
      if (expenses[date]) {
        expense = !expenses[date].false ? 0 : expenses[date].false;
        debitTransfers = !expenses[date].true ? 0 : expenses[date].true;
      }

      totalExpenses += expense;
      totalIncome += income;
      balance += income + expense + creditTransfers + debitTransfers;
      totalTransfers += creditTransfers + debitTransfers;
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
            {creditTransfers + debitTransfers !== 0 && (
              <AlignedText
                left="Transfers:"
                right={integerToCurrency(creditTransfers + debitTransfers)}
              />
            )}
            <AlignedText left="Balance:" right={integerToCurrency(balance)} />
          </div>
        </div>
      );

      res.income.push({ x, y: integerToAmount(income) });
      res.expenses.push({ x, y: integerToAmount(expense) });
      res.transfers.push({
        x,
        y: integerToAmount(creditTransfers + debitTransfers),
      });
      res.balances.push({
        x,
        y: integerToAmount(balance),
        premadeLabel: label,
        amount: balance,
      });
      return res;
    },
    { expenses: [], income: [], transfers: [], balances: [] },
  );

  const { balances } = graphData;

  return {
    graphData,
    balance: balances[balances.length - 1].amount,
    totalExpenses,
    totalIncome,
    totalTransfers,
    totalChange: balances[balances.length - 1].amount - balances[0].amount,
  };
}
