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

export type ScheduledCashFlowEntry = {
  date: string;
  amount: number;
};

export function simpleCashFlow(
  startMonth: string,
  endMonth: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  scheduledTransactions: ScheduledCashFlowEntry[] = [],
) {
  const start = monthUtils.firstDayOfMonth(startMonth);
  const end = monthUtils.lastDayOfMonth(endMonth);
  const today = monthUtils.currentDay();
  const fixedEnd = end > today ? today : end;

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: {
      graphData: {
        income: number;
        expense: number;
        projectedIncome: number;
        projectedExpense: number;
      };
    }) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    function makeQuery() {
      return q('transactions')
        .filter({
          [conditionsOpKey]: filters,
        })
        .filter({
          $and: [{ date: { $gte: start } }, { date: { $lte: fixedEnd } }],
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
        // Sum projected scheduled transactions in the future portion of the range
        let projectedIncome = 0;
        let projectedExpense = 0;
        for (const t of scheduledTransactions) {
          if (t.date > today && t.date >= start && t.date <= end) {
            if (t.amount > 0) {
              projectedIncome += t.amount;
            } else {
              projectedExpense += t.amount;
            }
          }
        }

        setData({
          graphData: {
            income: data[0],
            expense: data[1],
            projectedIncome,
            projectedExpense,
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
  locale: Locale,
  format: (value: unknown, type?: FormatType) => string,
  scheduledTransactions: ScheduledCashFlowEntry[] = [],
) {
  const start = monthUtils.firstDayOfMonth(startMonth);
  const end = monthUtils.lastDayOfMonth(endMonth);
  const today = monthUtils.currentDay();
  const fixedEnd = end > today ? today : end;

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
        setData(
          recalculate(
            data,
            start,
            end,
            fixedEnd,
            isConcise,
            locale,
            format,
            scheduledTransactions,
          ),
        );
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
  fixedEnd: string,
  isConcise: boolean,
  locale: Locale,
  format: (value: unknown, type?: FormatType) => string,
  scheduledTransactions: ScheduledCashFlowEntry[],
) {
  const [startingBalance, income, expense] = data;
  const convIncome = income.map(trans => {
    return { ...trans, isTransfer: trans.isTransfer !== null };
  });
  const convExpense = expense.map(trans => {
    return { ...trans, isTransfer: trans.isTransfer !== null };
  });

  // Extend the date range to include future dates
  const dates = isConcise
    ? monthUtils.rangeInclusive(
        monthUtils.getMonth(start),
        monthUtils.getMonth(end),
      )
    : monthUtils.dayRangeInclusive(start, end);

  const incomes = indexCashFlow(convIncome);
  const expenses = indexCashFlow(convExpense);

  // Index scheduled transactions by date bucket
  const currentMonth = monthUtils.currentMonth();
  const scheduledByBucket: Record<string, { income: number; expense: number }> =
    {};
  for (const t of scheduledTransactions) {
    // Only include future scheduled transactions
    if (t.date <= fixedEnd) continue;
    const key = isConcise ? monthUtils.getMonth(t.date) : t.date;
    if (!scheduledByBucket[key]) {
      scheduledByBucket[key] = { income: 0, expense: 0 };
    }
    if (t.amount > 0) {
      scheduledByBucket[key].income += t.amount;
    } else {
      scheduledByBucket[key].expense += t.amount;
    }
  }

  let balance = startingBalance;
  let totalExpenses = 0;
  let totalIncome = 0;
  let totalTransfers = 0;
  let projectedTotalIncome = 0;
  let projectedTotalExpenses = 0;

  const graphData = dates.reduce<{
    expenses: Array<{ x: Date; y: number; projected: boolean }>;
    income: Array<{ x: Date; y: number; projected: boolean }>;
    transfers: Array<{ x: Date; y: number; projected: boolean }>;
    balances: Array<{
      x: Date;
      y: number;
      premadeLabel: JSX.Element;
      amount: number;
      projected: boolean;
    }>;
  }>(
    (res, date) => {
      const projected = isConcise ? date > currentMonth : date > fixedEnd;
      let income = 0;
      let expense = 0;
      let creditTransfers = 0;
      let debitTransfers = 0;

      if (projected) {
        const sched = scheduledByBucket[date];
        if (sched) {
          income = sched.income;
          expense = sched.expense;
        }
        projectedTotalIncome += income;
        projectedTotalExpenses += expense;
      } else {
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
        totalTransfers += creditTransfers + debitTransfers;
      }

      balance += income + expense + creditTransfers + debitTransfers;
      const x = d.parseISO(date);

      const label = (
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>
              {d.format(x, isConcise ? 'MMMM yyyy' : 'MMMM d, yyyy', {
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
            {projected && (
              <AlignedText
                left={t('(Projected)')}
                right={<FinancialText></FinancialText>}
              />
            )}
          </div>
        </div>
      );

      res.income.push({ x, y: income, projected });
      res.expenses.push({ x, y: expense, projected });
      res.transfers.push({
        x,
        y: creditTransfers + debitTransfers,
        projected,
      });
      res.balances.push({
        x,
        y: balance,
        premadeLabel: label,
        amount: balance,
        projected,
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
    projectedTotalIncome,
    projectedTotalExpenses,
    totalChange: balances[balances.length - 1].amount - balances[0].amount,
  };
}
