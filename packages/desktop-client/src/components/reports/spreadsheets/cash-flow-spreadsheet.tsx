import React from 'react';
import type { JSX } from 'react';

import { AlignedText } from '@actual-app/components/aligned-text';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import type { Locale } from 'date-fns';
import * as d from 'date-fns';
import { t } from 'i18next';

import { FinancialText } from '#components/FinancialText';
import { indexCashFlow, runAll } from '#components/reports/util';
import type { FormatType } from '#hooks/useFormat';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';

export type CashFlowGranularity = 'Daily' | 'Monthly' | 'Yearly';

export function cashFlowByDate(
  startMonth: string,
  endMonth: string,
  granularity: CashFlowGranularity,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or',
  locale: Locale,
  format: (value: unknown, type?: FormatType) => string,
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

      if (granularity === 'Monthly') {
        return query
          .groupBy([{ $month: '$date' }, 'payee.transfer_acct'])
          .select([
            { date: { $month: '$date' } },
            { isTransfer: 'payee.transfer_acct' },
            { amount: { $sum: '$amount' } },
          ]);
      }

      if (granularity === 'Yearly') {
        return query
          .groupBy([{ $year: '$date' }, 'payee.transfer_acct'])
          .select([
            { date: { $year: '$date' } },
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
        setData(
          recalculate(data, start, fixedEnd, granularity, locale, format),
        );
      },
    );
  };
}

// Exported for unit testing. Pure function: given query results plus a date
// window and granularity, build the chart series and per-period totals.
export function recalculate(
  data: [
    number,
    Array<{ date: string; isTransfer: string | null; amount: number }>,
    Array<{ date: string; isTransfer: string | null; amount: number }>,
  ],
  start: string,
  end: string,
  granularity: CashFlowGranularity,
  locale: Locale,
  format: (value: unknown, type?: FormatType) => string,
) {
  const [startingBalance, income, expense] = data;
  const convIncome = income.map(trans => {
    return { ...trans, isTransfer: trans.isTransfer !== null };
  });
  const convExpense = expense.map(trans => {
    return { ...trans, isTransfer: trans.isTransfer !== null };
  });
  const dates =
    granularity === 'Monthly'
      ? monthUtils.rangeInclusive(
          monthUtils.getMonth(start),
          monthUtils.getMonth(end),
        )
      : granularity === 'Yearly'
        ? monthUtils.yearRangeInclusive(start, end)
        : monthUtils.dayRangeInclusive(start, end);
  const incomes = indexCashFlow(convIncome);
  const expenses = indexCashFlow(convExpense);

  let balance = startingBalance;
  let totalExpenses = 0;
  let totalIncome = 0;
  let totalTransfers = 0;

  const tooltipDateFormat =
    granularity === 'Monthly'
      ? 'MMMM yyyy'
      : granularity === 'Yearly'
        ? 'yyyy'
        : 'MMMM d, yyyy';

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
              {d.format(x, tooltipDateFormat, {
                locale,
              })}
            </strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <AlignedText
              left={t('Income:')}
              right={
                <FinancialText>{format(income, 'financial')}</FinancialText>
              }
            />
            <AlignedText
              left={t('Expenses:')}
              right={
                <FinancialText>{format(expense, 'financial')}</FinancialText>
              }
            />
            <AlignedText
              left={t('Change:')}
              right={
                <FinancialText as="strong">
                  {format(income + expense, 'financial')}
                </FinancialText>
              }
            />
            {creditTransfers + debitTransfers !== 0 && (
              <AlignedText
                left={t('Transfers:')}
                right={
                  <FinancialText>
                    {format(creditTransfers + debitTransfers, 'financial')}
                  </FinancialText>
                }
              />
            )}
            <AlignedText
              left={t('Balance:')}
              right={
                <FinancialText>{format(balance, 'financial')}</FinancialText>
              }
            />
          </div>
        </div>
      );

      res.income.push({ x, y: income });
      res.expenses.push({ x, y: expense });
      res.transfers.push({
        x,
        y: creditTransfers + debitTransfers,
      });
      res.balances.push({
        x,
        y: balance,
        premadeLabel: label,
        amount: balance,
      });
      return res;
    },
    { expenses: [], income: [], transfers: [], balances: [] },
  );

  const { balances } = graphData;
  const lastBalance =
    balances.length > 0
      ? balances[balances.length - 1].amount
      : startingBalance;
  const firstBalance =
    balances.length > 0 ? balances[0].amount : startingBalance;

  return {
    graphData,
    balance: lastBalance,
    totalExpenses,
    totalIncome,
    totalTransfers,
    totalChange: lastBalance - firstBalance,
  };
}
