import React, { useEffect, useMemo, useState } from 'react';

import {
  addDays,
  format,
  getDate,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { theme } from '../../style';
import { Button } from '../common/Button2';
import { View } from '../common/View';

type CalendarMonthProps = {
  start: Date;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
};
export function CalendarMonth({
  start,
  firstDayOfWeekIdx,
}: CalendarMonthProps) {
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const startingDate = startOfWeek(new Date(), {
    weekStartsOn:
      firstDayOfWeekIdx !== undefined &&
      !Number.isNaN(parseInt(firstDayOfWeekIdx)) &&
      parseInt(firstDayOfWeekIdx) >= 0 &&
      parseInt(firstDayOfWeekIdx) <= 6
        ? (parseInt(firstDayOfWeekIdx) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        : 0,
  });

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const begin = startOfWeek(startOfMonth(start), {
      weekStartsOn:
        firstDayOfWeekIdx !== undefined &&
        !Number.isNaN(parseInt(firstDayOfWeekIdx)) &&
        parseInt(firstDayOfWeekIdx) >= 0 &&
        parseInt(firstDayOfWeekIdx) <= 6
          ? (parseInt(firstDayOfWeekIdx) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
          : 0,
    });
    const days = Array.from({ length: 42 }).map((_, index) =>
      addDays(begin, index),
    );
    setCalendarDays(days);
  }, [start, firstDayOfWeekIdx]);

  return (
    <View
      style={{
        width: '250px',
        backgroundColor: theme.cardBackground,
        borderRadius: 6,
        padding: 6,
      }}
    >
      <View style={{ width: '100%', textAlign: 'center', marginBottom: 4 }}>
        {format(start, 'MMMM yyyy')}
      </View>
      <View
        style={{
          color: theme.pageTextSubdued,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: '1fr',
          gap: 2,
        }}
      >
        {Array.from({ length: 7 }, (_, index) => (
          <View
            key={index}
            style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 500,
              padding: '3px 0',
              height: '100%',
              width: '100%',
              position: 'relative',
              marginBottom: 4,
            }}
          >
            {format(addDays(startingDate, index), 'EEEEE')}
          </View>
        ))}
      </View>
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: '1fr',
          gap: 2,
          width: '100%',
          height: '100%',
        }}
      >
        {calendarDays.map((day, index) => (
          <View style={{ position: 'relative' }} key={index}>
            <Button
              variant="bare"
              key={index}
              style={{ opacity: isSameMonth(start, day) ? 1 : 0.3 }}
            >
              {getDate(day)}
            </Button>
            {isSameDay(day, today) && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: '1px solid',
                  borderColor: theme.pageTextPositive,
                  borderRadius: 200,
                  pointerEvents: 'none',
                }}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
