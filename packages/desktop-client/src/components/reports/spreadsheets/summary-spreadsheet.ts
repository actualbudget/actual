import * as d from 'date-fns';

import { runQuery } from 'loot-core/src/client/query-helpers';
import { type useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import {
  type SummaryContent,
  type RuleConditionEntity,
} from 'loot-core/types/models';

export function summarySpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  summaryContent: SummaryContent,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: { total: number }) => void,
  ) => {
    let filters = [];
    try {
      const response = await send('make-filters-from-conditions', {
        conditions: conditions.filter(cond => !cond.customName),
      });
      filters = response.filters;
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const startDay = d.parse(
      monthUtils.firstDayOfMonth(start),
      'yyyy-MM-dd',
      new Date(),
    );

    const endDay = d.parse(
      monthUtils.lastDayOfMonth(end),
      'yyyy-MM-dd',
      new Date(),
    );

    if (d.isAfter(startDay, endDay)) {
      throw new Error('Start date must be before or equal to end date.');
    }

    const getOneDatePerMonth = (start: Date, end: Date) => {
      const months = [];
      let currentDate = d.startOfMonth(start);

      while (!d.isSameMonth(currentDate, end)) {
        months.push(currentDate);
        currentDate = d.addMonths(currentDate, 1);
      }
      months.push(end);

      return months;
    };

    const makeRootQuery = () =>
      q('transactions')
        .filter({
          $and: [
            {
              date: {
                $gte: d.format(startDay, 'yyyy-MM-dd'),
              },
            },
            {
              date: {
                $lte: d.format(endDay, 'yyyy-MM-dd'),
              },
            },
          ],
        })
        .filter({
          [conditionsOpKey]: filters,
        })
        .select([
          'date',
          { amount: { $sum: '$amount' } },
          { count: { $count: '*' } },
        ]);

    let query = makeRootQuery();

    if (summaryContent.type === 'avgPerMonth') {
      query = query.groupBy(['date']);
    }

    let data;
    try {
      data = await runQuery(query);
    } catch (error) {
      console.error('Error executing query:', error);
      return;
    }

    switch (summaryContent.type) {
      case 'sum':
        setData({
          total: (data.data[0]?.amount ?? 0) / 100,
        });
        break;

      case 'avgPerTransact':
        setData({
          total:
            ((data.data[0]?.count ?? 0)
              ? (data.data[0]?.amount ?? 0) / data.data[0].count
              : 0) / 100,
        });
        break;

      case 'avgPerMonth': {
        const months = getOneDatePerMonth(startDay, endDay);
        setData(calculatePerMonth(data.data, months));
        break;
      }

      case 'percentage':
        setData(
          await calculatePercentage(
            data.data,
            summaryContent,
            startDay,
            endDay,
          ),
        );
        break;
    }
  };
}

function calculatePerMonth(
  data: Array<{
    date: string;
    amount: number;
    count: number;
  }>,
  months: Date[],
) {
  if (!data.length || !months.length) {
    return { total: 0 };
  }

  const monthlyData = data.reduce(
    (acc, day) => {
      const monthKey = d.format(
        d.parse(day.date, 'yyyy-MM-dd', new Date()),
        'yyyy-MM',
      );
      acc[monthKey] = (acc[monthKey] || 0) + day.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const monthsSum = months.map(m => ({
    amount: monthlyData[d.format(m, 'yyyy-MM')] || 0,
  }));

  const totalAmount = monthsSum.reduce((sum, month) => sum + month.amount, 0);
  const averageAmountPerMonth = totalAmount / months.length;

  return {
    total: averageAmountPerMonth / 100,
  };
}

async function calculatePercentage(
  data: Array<{
    amount: number;
  }>,
  summaryContent: SummaryContent,
  startDay: Date,
  endDay: Date,
) {
  if (summaryContent.type !== 'percentage') {
    return {
      total: 0,
    };
  }

  const conditionsOpKey =
    summaryContent.divisorConditionsOp === 'or' ? '$or' : '$and';
  const { filters } = await send('make-filters-from-conditions', {
    conditions: summaryContent?.divisorConditions?.filter(
      cond => !cond.customName,
    ),
  });

  const makeDivisorQuery = () =>
    q('transactions')
      .filter({
        [conditionsOpKey]: filters,
      })
      .select([{ amount: { $sum: '$amount' } }]);

  let query = makeDivisorQuery();

  if (summaryContent.divisorIncludeDateRange ?? true) {
    query = query.filter({
      $and: [
        {
          date: {
            $gte: d.format(startDay, 'yyyy-MM-dd'),
          },
        },
        {
          date: {
            $lte: d.format(endDay, 'yyyy-MM-dd'),
          },
        },
      ],
    });
  }

  const divisorData = (await runQuery(query)) as { data: { amount: number }[] };

  const divisorValue = divisorData?.data?.[0]?.amount ?? 0;

  if (divisorValue === 0) {
    return {
      total: 0,
    };
  }

  return {
    total:
      Math.round(
        (data.reduce((prev, ac) => prev + (ac?.amount ?? 0), 0) /
          divisorValue) *
          10000,
      ) / 100,
  };
}
