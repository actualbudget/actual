import * as d from 'date-fns';
import { type Locale } from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  type SummaryContent,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export function summarySpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  summaryContent: SummaryContent,
  locale: Locale,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: {
      total: number;
      divisor: number;
      dividend: number;
      fromRange: string;
      toRange: string;
    }) => void,
  ) => {
    let filters: unknown[] = [];
    try {
      const response = await send('make-filters-from-conditions', {
        conditions: conditions.filter(cond => !cond.customName),
      });
      filters = response.filters;
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    let startDay: Date;
    let endDay: Date;
    try {
      startDay = d.parse(
        monthUtils.firstDayOfMonth(start),
        'yyyy-MM-dd',
        new Date(),
      );

      endDay = d.parse(
        monthUtils.getMonth(end) ===
          monthUtils.getMonth(monthUtils.currentDay())
          ? monthUtils.currentDay()
          : monthUtils.lastDayOfMonth(end),
        'yyyy-MM-dd',
        new Date(),
      );
    } catch (error) {
      console.error('Error parsing dates:', error);
      throw new Error('Invalid date format provided');
    }

    if (!d.isValid(startDay) || !d.isValid(endDay)) {
      throw new Error('Invalid date values provided');
    }

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
      data = await aqlQuery(query);
    } catch (error) {
      console.error('Error executing query:', error);
      return;
    }

    const dateRanges = {
      fromRange: d.format(startDay, 'MMM yy', { locale }),
      toRange: d.format(endDay, 'MMM yy', { locale }),
    };

    switch (summaryContent.type) {
      case 'sum':
        setData({
          ...dateRanges,
          total: data.data[0]?.amount ?? 0,
          dividend: data.data[0]?.amount ?? 0,
          divisor: 0,
        });
        break;

      case 'avgPerTransact':
        setData({
          ...dateRanges,
          total:
            (data.data[0]?.count ?? 0)
              ? (data.data[0]?.amount ?? 0) / data.data[0].count
              : 0,
          dividend: data.data[0]?.amount ?? 0,
          divisor: data.data[0].count,
        });
        break;

      case 'avgPerMonth': {
        const months = getOneDatePerMonth(startDay, endDay);
        setData({ ...dateRanges, ...calculatePerMonth(data.data, months) });
        break;
      }

      case 'percentage':
        setData({
          ...dateRanges,
          ...(await calculatePercentage(
            data.data,
            summaryContent,
            startDay,
            endDay,
          )),
        });
        break;

      default:
        throw new Error(`Unsupported summary type`);
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
    return { total: 0, dividend: 0, divisor: 0 };
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

  const lastMonth = months.at(-1)!;
  const dayOfMonth = lastMonth.getDate();
  const daysInMonth = monthUtils.getDay(monthUtils.lastDayOfMonth(lastMonth));
  const numMonths = months.length - 1 + dayOfMonth / daysInMonth;

  const totalAmount = monthsSum.reduce((sum, month) => sum + month.amount, 0);
  const averageAmountPerMonth = totalAmount / numMonths;

  return {
    total: averageAmountPerMonth,
    dividend: totalAmount,
    divisor: numMonths,
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
      dividend: 0,
      divisor: 0,
    };
  }

  const conditionsOpKey =
    summaryContent.divisorConditionsOp === 'or' ? '$or' : '$and';
  let filters = [];
  try {
    const response = await send('make-filters-from-conditions', {
      conditions: summaryContent?.divisorConditions?.filter(
        cond => !cond.customName,
      ),
    });
    filters = response.filters;
  } catch (error) {
    console.error('Error creating filters:', error);
    return {
      total: 0,
      dividend: 0,
      divisor: 0,
    };
  }

  const makeDivisorQuery = () =>
    q('transactions')
      .filter({
        [conditionsOpKey]: filters,
      })
      .select([{ amount: { $sum: '$amount' } }]);

  let query = makeDivisorQuery();

  if (!(summaryContent.divisorAllTimeDateRange ?? false)) {
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

  let divisorData;
  try {
    divisorData = (await aqlQuery(query)) as { data: { amount: number }[] };
  } catch (error) {
    console.error('Error executing divisor query:', error);
    return {
      total: 0,
      dividend: 0,
      divisor: 0,
    };
  }

  const divisorValue = divisorData?.data?.[0]?.amount ?? 0;

  const dividend = data.reduce((prev, ac) => prev + (ac?.amount ?? 0), 0);
  return {
    total: Math.round(((dividend ?? 0) / (divisorValue ?? 1)) * 10000) / 100,
    divisor: divisorValue ?? 0,
    dividend: dividend ?? 0,
  };
}
