import * as d from 'date-fns';

import { runQuery } from 'loot-core/src/client/query-helpers';
import { type useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import { type RuleConditionEntity } from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

export type CalendarDataType = {
  date: Date;
  incomeValue: number;
  expenseValue: number;
  incomeSize: number;
  expenseSize: number;
};
export function calendarSpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: {
      calendarData: {
        start: Date;
        end: Date;
        data: CalendarDataType[];
        totalExpense: number;
        totalIncome: number;
      }[];
    }) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
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

    const makeRootQuery = () =>
      q('transactions')
        .filter({
          $and: [
            { date: { $gte: d.format(startDay, 'yyyy-MM-dd') } },
            { date: { $lte: d.format(endDay, 'yyyy-MM-dd') } },
          ],
        })
        .filter({
          [conditionsOpKey]: filters,
        })
        .groupBy(['date'])
        .select(['date', { amount: { $sum: '$amount' } }]);

    const expenseData = await runQuery(
      makeRootQuery().filter({
        $and: { amount: { $lt: 0 } },
      }),
    );

    const incomeData = await runQuery(
      makeRootQuery().filter({
        $and: { amount: { $gt: 0 } },
      }),
    );

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

    setData(
      recalculate(
        incomeData.data,
        expenseData.data,
        getOneDatePerMonth(startDay, endDay),
        start,
        firstDayOfWeekIdx,
      ),
    );
  };
}

function recalculate(
  incomeData: Array<{
    date: string;
    amount: number;
  }>,
  expenseData: Array<{
    date: string;
    amount: number;
  }>,
  months: Date[],
  start: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
) {
  const getDaysArray = (month: Date) => {
    const expenseValues = expenseData
      .filter(f =>
        d.isSameMonth(d.parse(f.date, 'yyyy-MM-dd', new Date()), month),
      )
      .map(m => Math.abs(m.amount));
    const incomeValues = incomeData
      .filter(f =>
        d.isSameMonth(d.parse(f.date, 'yyyy-MM-dd', new Date()), month),
      )
      .map(m => Math.abs(m.amount));

    const totalExpenseValue = expenseValues.length
      ? expenseValues.reduce((acc, val) => acc + val, 0)
      : null;

    const totalIncomeValue = incomeValues.length
      ? incomeValues.reduce((acc, val) => acc + val, 0)
      : null;

    const getBarLength = (value: number) => {
      if (value < 0 && totalExpenseValue !== null && totalExpenseValue !== 0) {
        return (Math.abs(value) / totalExpenseValue) * 100;
      } else if (
        value > 0 &&
        totalIncomeValue !== null &&
        totalIncomeValue !== 0
      ) {
        return (value / totalIncomeValue) * 100;
      } else {
        return 0;
      }
    };

    const firstDay = d.startOfMonth(month);
    const beginDay = d.startOfWeek(firstDay, {
      weekStartsOn: firstDayOfWeekIdx
        ? (parseInt(firstDayOfWeekIdx) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        : 0,
    });
    let totalDays =
      d.differenceInDays(firstDay, beginDay) + d.getDaysInMonth(firstDay);
    if (totalDays % 7 !== 0) {
      totalDays += 7 - (totalDays % 7);
    }
    const daysArray = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDate = d.addDays(beginDay, i);
      if (!d.isSameMonth(currentDate, firstDay)) {
        daysArray.push({
          date: currentDate,
          incomeValue: 0,
          expenseValue: 0,
          incomeSize: 0,
          expenseSize: 0,
        });
      } else {
        const currentIncome =
          incomeData.find(f =>
            d.isSameDay(d.parse(f.date, 'yyyy-MM-dd', new Date()), currentDate),
          )?.amount ?? 0;

        const currentExpense =
          expenseData.find(f =>
            d.isSameDay(d.parse(f.date, 'yyyy-MM-dd', new Date()), currentDate),
          )?.amount ?? 0;
        daysArray.push({
          date: currentDate,
          incomeSize: getBarLength(currentIncome),
          incomeValue: Math.abs(currentIncome) / 100,
          expenseSize: getBarLength(currentExpense),
          expenseValue: Math.abs(currentExpense) / 100,
        });
      }
    }

    return {
      data: daysArray as CalendarDataType[],
      totalExpense: (totalExpenseValue ?? 0) / 100,
      totalIncome: (totalIncomeValue ?? 0) / 100,
    };
  };

  return {
    calendarData: months.map(m => {
      return {
        ...getDaysArray(m),
        start: d.startOfMonth(m),
        end: d.endOfMonth(m),
      };
    }),
  };
}
