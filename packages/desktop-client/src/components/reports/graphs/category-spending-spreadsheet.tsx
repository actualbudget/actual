import React from 'react';

import * as d from 'date-fns';

import { rolloverBudget } from 'loot-core/src/client/queries';
import q, { runQuery } from 'loot-core/src/client/query-helpers';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount, integerToCurrency } from 'loot-core/src/shared/util';

import AlignedText from '../../common/AlignedText';

type CategoryGraphDataForMonth = {
  x: number;
  y: number;
  premadeLabel: JSX.Element;

  average: number;
  budgeted: number;
  total: number;
};

export type CategorySpendingGraphData = {
  categories: Category[];
  tickValues: number[];
  data: { [category: string]: CategoryGraphDataForMonth[] };
};

type Category = {
  id: string;
  name: string;
};

type CategoryBudgetForMonth = {
  budgeted: number;
  sumAmount: number;
  balance: number;
};
type CategoryBudgetPerMonth = {
  [month: string]: CategoryBudgetForMonth;
};

export default function createSpreadsheet(
  start: string | null,
  end: string | null,
  numberOfMonthsAverage: number,
  categories: Category[],
) {
  return async (
    spreadsheet: {
      get: (sheet: string, cell: string) => Promise<{ value: number }>;
    },
    setData: (graphData: CategorySpendingGraphData) => void,
  ) => {
    if (start === null || end === null || categories.length === 0) {
      setData({ categories: [], tickValues: [], data: {} });
      return;
    }

    // Calculate the range of months that we will return data for.  This will
    // contain more months than the specified start-end range in case we're
    // averaging data.
    let months: string[];
    if (numberOfMonthsAverage === -1) {
      // `numberOfMonthsAverage` is set to -1 to mean "all time."
      const firstTransaction = await runQuery(
        q('transactions')
          .filter({
            $or: categories.map(category => ({ category: category.id })),
          })
          .orderBy({ date: 'asc' })
          .limit(1)
          .select('date'),
      );
      if (firstTransaction.data.length === 0) {
        setData({ categories: [], tickValues: [], data: {} });
        return;
      }

      months = monthUtils.rangeInclusive(
        monthUtils.monthFromDate(firstTransaction.data[0].date),
        end,
      );
    } else {
      months = monthUtils.rangeInclusive(
        monthUtils.subMonths(start, numberOfMonthsAverage),
        end,
      );
    }

    const budgetForMonth = async (
      sheet: string,
      category: Category,
    ): Promise<CategoryBudgetForMonth> =>
      Promise.all([
        spreadsheet
          .get(sheet, rolloverBudget.catBudgeted(category.id))
          .then((cell: { value: number }) => cell.value ?? 0),
        spreadsheet
          .get(sheet, rolloverBudget.catSumAmount(category.id))
          .then((cell: { value: number }) => cell.value ?? 0),
        spreadsheet
          .get(sheet, rolloverBudget.catBalance(category.id))
          .then((cell: { value: number }) => cell.value ?? 0),
      ]).then(([budgeted, sumAmount, balance]) => ({
        budgeted,
        sumAmount,
        balance,
      }));

    const budgetPerMonth = async (
      category: Category,
    ): Promise<CategoryBudgetPerMonth> =>
      months.reduce(
        async (perMonth, month) => ({
          ...(await perMonth),
          [month]: await budgetForMonth(
            monthUtils.sheetForMonth(month),
            category,
          ),
        }),
        Promise.resolve({}),
      );

    const data: { [category: string]: CategoryGraphDataForMonth[] } =
      await categories.reduce(
        async (perCategory, category) => ({
          ...(await perCategory),
          [category.id]: await budgetPerMonth(category).then(perMonth =>
            recalculate(start, end, category, numberOfMonthsAverage, perMonth),
          ),
        }),
        Promise.resolve({}),
      );

    setData({
      categories,
      tickValues: data[categories[0].id].map(item => item.x),
      data,
    });
  };
}

function recalculate(
  start: string,
  end: string,
  category: Category,
  numberOfMonthsAverage: number,
  budgetPerMonth: CategoryBudgetPerMonth,
): CategoryGraphDataForMonth[] {
  const months = monthUtils.rangeInclusive(start, end);
  const [averagedData, _] = months.reduce(
    ([arr, idx], month) => {
      const thisMonth = budgetPerMonth[month];
      const x = d.parseISO(`${month}-01`);

      const months = numberOfMonthsAverage === -1 ? idx : numberOfMonthsAverage;
      const sumAmounts = [];
      for (let i = 0; i < months; i++) {
        sumAmounts.push(
          budgetPerMonth[monthUtils.subMonths(month, i)].sumAmount,
        );
      }
      const average = sumAmounts.reduce((a, b) => a + b) / sumAmounts.length;

      const label = (
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>{category.name}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            {numberOfMonthsAverage !== 0 && (
              <>
                <AlignedText
                  left="Average:"
                  right={integerToCurrency(Math.round(average))}
                />
                <hr />
              </>
            )}
            <AlignedText
              left="Budgeted:"
              right={integerToCurrency(thisMonth.budgeted)}
            />
            <AlignedText
              left="Spent:"
              right={integerToCurrency(thisMonth.sumAmount)}
            />
            <AlignedText
              left="Balance:"
              right={integerToCurrency(thisMonth.balance)}
            />
          </div>
        </div>
      );

      return [
        [
          ...arr,
          {
            x,
            y: integerToAmount(Math.round(average)),
            premadeLabel: label,

            average,
            budgeted: thisMonth.budgeted,
            total: thisMonth.sumAmount,
          },
        ],
        idx + 1,
      ];
    },
    [[], 1],
  );

  return averagedData;
}
