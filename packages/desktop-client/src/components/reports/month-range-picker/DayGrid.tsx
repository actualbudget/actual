import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import type { Locale } from 'date-fns';

import { Grid } from './Grid';
import { GridButton } from './GridButton';
import { rangePosition, toDayEnd, toDayStart } from './util';

type DayGridProps = {
  viewMonth: string;
  rangeStart: string;
  rangeEnd: string;
  min: string;
  max: string;
  locale: Locale;
  /** User's configured first day of week, for the weekday header order and
   * grid alignment. Defaults to Sunday-first when omitted. */
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onSelect: (day: string) => void;
  /** Notified on pointer-enter of a cell, to preview the range band while
   * picking the second endpoint. Omitted when there's no anchor to preview
   * against. */
  onHover?: (day: string) => void;
};

export function DayGrid({
  viewMonth,
  rangeStart,
  rangeEnd,
  min,
  max,
  locale,
  firstDayOfWeekIdx,
  onSelect,
  onHover,
}: DayGridProps) {
  const firstDay = monthUtils.firstDayOfMonth(`${viewMonth}-01`);
  const lastDay = monthUtils.lastDayOfMonth(`${viewMonth}-01`);
  const days = monthUtils.dayRangeInclusive(firstDay, lastDay);
  const currentDay = monthUtils.currentDay();
  // `min`/`max` may still be month-shaped (e.g. a report's `minDate`) even
  // in day mode; normalize to day bounds so the comparison below is
  // apples-to-apples instead of comparing a `yyyy-MM-dd` cell against a
  // `yyyy-MM` bound.
  const minDay = toDayStart(min);
  const maxDay = toDayEnd(max);
  // 0 = Sunday, ... 6 = Saturday; defaults to Sunday-first to match the rest
  // of the app when a report doesn't pass the user's configured pref.
  const startOfWeek = parseInt(firstDayOfWeekIdx || '0', 10) || 0;
  // Weekday of the 1st relative to `startOfWeek` so the grid lines up under
  // its headers regardless of which day the week starts on.
  const leadingBlanks =
    (new Date(`${firstDay}T00:00:00`).getDay() - startOfWeek + 7) % 7;

  return (
    <>
      <Grid columns={7} gap={2} style={{ marginBottom: 4 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 'bold',
              color: theme.pageTextSubdued,
            }}
          >
            {/* 2021-01-03 is a Sunday; offset by startOfWeek so the header
              order follows the user's configured first day of week. */}
            {monthUtils.format(
              monthUtils.addDays('2021-01-03', startOfWeek + i),
              'EEEEE',
              locale,
            )}
          </Text>
        ))}
      </Grid>
      <Grid columns={7}>
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <View key={`blank-${i}`} />
        ))}
        {days.map(day => {
          const position = rangePosition(day, rangeStart, rangeEnd);
          return (
            <GridButton
              key={day}
              selected={day === rangeStart || day === rangeEnd}
              disabled={day < minDay || day > maxDay}
              isToday={day === currentDay}
              inRange={position != null}
              rangeEdge={
                position === 'middle' || position == null ? undefined : position
              }
              onSelect={() => onSelect(day)}
              onHover={onHover ? () => onHover(day) : undefined}
            >
              {String(monthUtils.getDay(day))}
            </GridButton>
          );
        })}
      </Grid>
    </>
  );
}
