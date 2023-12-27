import React from 'react';

import * as d from 'date-fns';

import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency, integerToAmount } from 'loot-core/src/shared/util';

import AlignedText from '../../common/AlignedText';
import { runAll, indexCashFlow } from '../util';

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
              'payee.transfer_acct': null,
            },
          ],
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
  start,
  end,
  forecast,
  isConcise,
  conditions = [],
  conditionsOp,
) {
  return async (spreadsheet, setData) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    function makeQuery(where) {
      const query = q('transactions')
        .filter({
          [conditionsOpKey]: filters,
        })
        .filter({
          $and: [
            { date: { $transform: '$month', $gte: start } },
            { date: { $transform: '$month', $lte: end } },
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

    let scheduleQuery = q('schedules').select([
      '*',
      { isTransfer: '_payee.transfer_acct' },
      { isAccountOffBudget: '_account.offbudget' },
      { isPayeeOffBudget: '_payee.transfer_acct.offbudget' },
    ]);

    type ScheduleFilter = {
      account: string;
      payee: string;
    };
    const scheduleFilters = filters
      .map((filter: ScheduleFilter) => {
        if (filter.hasOwnProperty('account')) {
          const { account } = filter;
          return [{ _account: account }, { '_payee.transfer_acct': account }];
        }
        if (filter.hasOwnProperty('payee')) {
          const { payee } = filter;
          return { _payee: payee };
        }
        return filter;
      })
      .flat();

    if (scheduleFilters.length > 0) {
      scheduleQuery = scheduleQuery.filter({
        $or: [...scheduleFilters],
      });
    }

    const { data } = await runQuery(scheduleQuery);

    const schedules = await Promise.all(
      data.map(schedule => {
        if (typeof schedule._date !== 'string') {
          return sendCatch('schedule/get-occurrences-to-date', {
            config: schedule._date,
            end: forecast,
          }).then(({ data }) => {
            schedule._dates = data;
            return schedule;
          });
        } else {
          schedule._dates = [schedule._date];
          return schedule;
        }
      }),
    );

    return runAll(
      [
        q('transactions')
          .filter({
            [conditionsOpKey]: filters,
            date: { $transform: '$month', $lt: start },
            'account.offbudget': false,
          })
          .calculate({ $sum: '$amount' }),
        makeQuery('amount > 0').filter({ amount: { $gt: 0 } }),
        makeQuery('amount < 0').filter({ amount: { $lt: 0 } }),
      ],
      data => {
        setData(
          recalculate(
            data,
            start,
            end,
            forecast,
            isConcise,
            schedules,
            filters,
          ),
        );
      },
    );
  };
}

function recalculate(
  data,
  start,
  end,
  forecast,
  isConcise,
  schedules,
  filters,
) {
  const [startingBalance, income, expense] = data;
  const convIncome = income.map(t => {
    return { ...t, isTransfer: t.isTransfer !== null };
  });
  const convExpense = expense.map(t => {
    return { ...t, isTransfer: t.isTransfer !== null };
  });

  const futureIncome = [];
  const futureExpense = [];
  schedules.forEach(schedule => {
    schedule._dates?.forEach(date => {
      const futureTx = {
        date: isConcise ? monthUtils.monthFromDate(date) : date,
        isTransfer: schedule.isTransfer != null,
        trasferAccount: schedule.isTransfer,
        amount:
          schedule._amountOp === 'isbetween'
            ? (schedule._amount.num1 + schedule._amount.num2) / 2
            : schedule._amount,
      };

      const includeFutureTx =
        filters.reduce((include, filter) => {
          return (
            include ||
            (filter.hasOwnProperty('account')
              ? filter.account.$eq === schedule._account
              : true)
          );
        }, filters.length === 0) && !schedule.isAccountOffBudget;

      const includeTransfer = filters.reduce((include, filter) => {
        return (
          include ||
          (filter.hasOwnProperty('account')
            ? filter.account.$eq === futureTx.trasferAccount
            : true)
        );
      }, filters.length === 0);

      if (
        futureTx.isTransfer &&
        !schedule.isPayeeOffBudget &&
        includeTransfer
      ) {
        const futureTxTransfer = {
          date: isConcise ? monthUtils.monthFromDate(date) : date,
          isTransfer: schedule.isTransfer != null,
          amount: -schedule._amount,
        };
        if (futureTxTransfer.amount < 0) {
          futureExpense.push(futureTxTransfer);
        } else {
          futureIncome.push(futureTxTransfer);
        }
      }

      if (includeFutureTx) {
        if (futureTx.amount < 0) {
          futureExpense.push(futureTx);
        } else {
          futureIncome.push(futureTx);
        }
      }
    });
  });

  const dates = isConcise
    ? monthUtils.rangeInclusive(
        monthUtils.getMonth(start),
        monthUtils.getMonth(end),
      )
    : monthUtils.dayRangeInclusive(start, end);

  let forecastDates;
  if (forecast === monthUtils.currentMonth()) {
    forecastDates = [];
  } else {
    forecastDates = isConcise
      ? monthUtils.rangeInclusive(
          monthUtils.getMonth(end),
          monthUtils.getMonth(forecast),
        )
      : monthUtils.dayRangeInclusive(end, forecast);
  }

  const incomes = indexCashFlow(convIncome, 'date', 'isTransfer');
  const expenses = indexCashFlow(convExpense, 'date', 'isTransfer');
  const futureIncomes = indexCashFlow(futureIncome, 'date', 'isTransfer');
  const futureExpenses = indexCashFlow(futureExpense, 'date', 'isTransfer');

  function calculate(dates, startingBalance, incomes, expenses) {
    let balance = startingBalance;
    let totalExpenses = 0;
    let totalIncome = 0;
    let totalTransfers = 0;

    const graphData = dates.reduce(
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
              <AlignedText
                left="Expenses:"
                right={integerToCurrency(expense)}
              />
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
        res.balances.push({
          x,
          y: integerToAmount(balance),
          premadeLabel: label,
          amount: balance,
        });
        return res;
      },
      { expenses: [], income: [], balances: [] },
    );
    return { graphData, totalExpenses, totalIncome, totalTransfers };
  }

  const { graphData, totalExpenses, totalIncome, totalTransfers } = calculate(
    dates,
    startingBalance,
    incomes,
    expenses,
  );

  const { balances } = graphData;

  const {
    graphData: futureGraphData,
    totalExpenses: futureTotalExpenses,
    totalIncome: futureTotalIncome,
    totalTransfers: futureTotalTransfers,
  } = calculate(
    forecastDates,
    balances[balances.length - 1].amount,
    futureIncomes,
    futureExpenses,
  );

  graphData.futureBalances = futureGraphData.balances;
  graphData.futureIncome = futureGraphData.income;
  graphData.futureExpenses = futureGraphData.expenses;

  return {
    graphData,
    balance: balances[balances.length - 1].amount,
    totalExpenses: totalExpenses + futureTotalExpenses,
    totalIncome: totalIncome + futureTotalIncome,
    totalTransfers: totalTransfers + futureTotalTransfers,
    totalChange: balances[balances.length - 1].amount - balances[0].amount,
  };
}
