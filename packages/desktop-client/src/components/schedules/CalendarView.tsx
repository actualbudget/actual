import { useEffect, useState } from 'react';

import { addMonths, addYears, format, startOfYear } from 'date-fns';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { theme } from '../../style';
import { MonthCountSelector } from '../budget/MonthCountSelector';
import { MonthPicker } from '../budget/MonthPicker';
import { View } from '../common/View';

import { CalendarMonth } from './CalendarMonth';

//type CalendarViewProps = {};

//export function CalendarView({}: CalendarViewProps) {
export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [numberOfMonths, setNumberOfMonths] = useState(6);
  const [months, setMonths] = useState([]);
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  useEffect(() => {
    if (currentDate) {
      const m = Array.from({ length: numberOfMonths }).map((v, index) =>
        addMonths(currentDate, index),
      );
      setMonths(m);
    }
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
            />
          </View>
        ))}
      </View>
    </View>
  );
}
