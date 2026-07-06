import { useState } from 'react';
import type { ReactNode } from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { Locale } from 'date-fns';

import { DayGrid } from './DayGrid';
import { MonthGrid } from './MonthGrid';
import { NavRow } from './NavRow';
import { clamp, toMonth } from './util';

type RangeEndSelectorProps = {
  title: ReactNode;
  value: string;
  /** Inclusive bound of the same granularity as `value`. */
  min: string;
  max: string;
  isDay: boolean;
  locale: Locale;
  onChange: (value: string) => void;
};

export function RangeEndSelector({
  title,
  value,
  min,
  max,
  isDay,
  locale,
  onChange,
}: RangeEndSelectorProps) {
  const minMonth = toMonth(min);
  const maxMonth = toMonth(max);

  // The month whose grid is on screen. Starts on the selected value's month
  // but can be navigated independently of the selection.
  const [viewMonth, setViewMonth] = useState(() => toMonth(value));
  const viewYear = monthUtils.getYear(viewMonth);
  const selectedMonth = toMonth(value);

  function selectMonth(month: string) {
    if (isDay) {
      // Keep the previously-picked day within the newly-chosen month.
      const day = value.slice(8, 10) || '01';
      const monthEnd = monthUtils.lastDayOfMonth(`${month}-01`);
      const candidate =
        `${month}-${day}` > monthEnd ? monthEnd : `${month}-${day}`;
      onChange(clamp(candidate, min, max));
      setViewMonth(month);
    } else {
      onChange(clamp(month, min, max));
    }
  }

  const prevMonth = monthUtils.prevMonth(viewMonth);
  const nextMonth = monthUtils.nextMonth(viewMonth);
  const prevYear = monthUtils.subYears(viewMonth, 1);
  const nextYear = monthUtils.addYears(viewMonth, 1);

  return (
    <View>
      <Text
        style={{
          fontWeight: 'bold',
          marginBottom: 8,
          fontSize: 12,
          textTransform: 'uppercase',
          color: theme.pageTextSubdued,
        }}
      >
        {title}
      </Text>

      <NavRow
        label={
          isDay ? monthUtils.format(viewMonth, 'MMMM yyyy', locale) : viewYear
        }
        canPrev={
          isDay
            ? viewMonth > minMonth
            : monthUtils.getYear(prevYear) >= monthUtils.getYear(minMonth)
        }
        canNext={
          isDay
            ? viewMonth < maxMonth
            : monthUtils.getYear(nextYear) <= monthUtils.getYear(maxMonth)
        }
        onPrev={() => setViewMonth(isDay ? prevMonth : prevYear)}
        onNext={() => setViewMonth(isDay ? nextMonth : nextYear)}
      />

      {isDay ? (
        <DayGrid
          viewMonth={viewMonth}
          value={value}
          min={min}
          max={max}
          locale={locale}
          onSelect={day => onChange(clamp(day, min, max))}
        />
      ) : (
        <MonthGrid
          year={viewYear}
          selectedMonth={selectedMonth}
          minMonth={minMonth}
          maxMonth={maxMonth}
          locale={locale}
          onSelect={selectMonth}
        />
      )}
    </View>
  );
}
