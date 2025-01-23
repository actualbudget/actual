import { useEffect, useState } from 'react';
import * as d from 'date-fns';

import { addMonths, addYears, format, startOfYear } from 'date-fns';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { theme } from '../../style';
import { MonthCountSelector } from '../budget/MonthCountSelector';
import { MonthPicker } from '../budget/MonthPicker';
import { View } from '../common/View';

import { CalendarMonth } from './CalendarMonth';
import { ScheduleEntity } from 'loot-core/types/models';
import { currentDay, addDays, parseDate } from 'loot-core/shared/months';

import { extractScheduleConds, getNextDate, getScheduledAmount, scheduleIsRecurring } from 'loot-core/shared/schedules';

type CalendarViewProps = {
  schedules: readonly ScheduleEntity[];
};

export type CalendarRecurrences = {
  id: string;
  payee: string;
  account: string;
  amount: number;
  date: string;
  dateObject: Date;
  schedule: string;
  forceUpcoming: boolean;
}

export function CalendarView({ schedules }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [numberOfMonths, setNumberOfMonths] = useState(6);
  const [months, setMonths] = useState<Date[]>([]);
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';
  const [visibleRecurrences, setVisibleRecurrences] = useState<CalendarRecurrences[]>([]);

  useEffect(() => {
    if (currentDate) {
      const m = Array.from({ length: numberOfMonths }).map((v, index) =>
        addMonths(currentDate, index),
      );
      setMonths(m);
    }

    const calculateRecurrences = (): CalendarRecurrences[] => {
      return schedules
        .map(schedule => {
          const { date: dateConditions } = extractScheduleConds(
            schedule._conditions,
          );
  
          const isRecurring = scheduleIsRecurring(dateConditions);
  
          const dates: string[] = [];
          let day = d.startOfDay(parseDate(currentDate));
          if (isRecurring) {
            while (day <= addMonths(currentDate, numberOfMonths)) {
              const nextDate = getNextDate(dateConditions, day);
  
              if (parseDate(nextDate) > addMonths(currentDate, numberOfMonths)) break;
  
              if (dates.includes(nextDate)) {
                day = parseDate(addDays(day, 1));
                continue;
              }
  
              dates.push(nextDate);
              day = parseDate(addDays(nextDate, 1));
            }
          } else {
            dates.push(getNextDate(dateConditions, day));
          }
  
          const schedules: CalendarRecurrences[] = [];
          dates.forEach(date => {
            schedules.push({
              id: 'preview/' + schedule.id + `/${date}`,
              payee: schedule._payee,
              account: schedule._account,
              amount: getScheduledAmount(schedule._amount),
              date,
              dateObject: parseDate(date),
              schedule: schedule.id,
              forceUpcoming: schedules.length > 0 || status === 'paid',
            });
          });
  
          return schedules;
        })
        .flat();
    }

    setVisibleRecurrences(calculateRecurrences());
  }, [currentDate, numberOfMonths]);

  

  return (
    <View
      style={{
        flexGrow: 1,
        backgroundColor: theme.tableBackground,
        borderRadius: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        overflow: 'auto',
      }}
    >
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          marginTop: 6,
        }}
      >
        <View style={{ flexGrow: 1, padding: 8 }}>
          <MonthCountSelector
            maxMonths={numberOfMonths}
            onChange={number => setNumberOfMonths(number)}
            numberOfMonths={12}
            validateDisplayMax={false}
          />
          <MonthPicker
            startMonth={format(currentDate, 'yyyy-MM')}
            numDisplayed={numberOfMonths}
            monthBounds={{
              start: format(startOfYear(new Date()), 'yyyy-MM'),
              end: format(addYears(new Date(), 5), 'yyyy-MM'),
            }}
            style={{ paddingTop: 15, flexGrow: 1 }}
            onSelect={month => setCurrentDate(new Date(month))}
          />
        </View>
      </View>
      <View
        style={{
          flexGrow: 1,
          backgroundColor: theme.tableBackground,
          borderRadius: 6,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
          height: 'calc(100% - 120px)',
        }}
      >
        {months.map((m, index) => (
          <View key={index} style={{ padding: 16 }}>
            <CalendarMonth
              key={index}
              start={m}
              firstDayOfWeekIdx={firstDayOfWeekIdx}
              recurrences={visibleRecurrences.filter(r => d.isSameMonth(m, r.dateObject))}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
