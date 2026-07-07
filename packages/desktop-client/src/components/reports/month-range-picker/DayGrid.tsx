import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { Locale } from 'date-fns';

import { Grid } from './Grid';
import { GridButton } from './GridButton';
import { rangePosition } from './util';

type DayGridProps = {
  viewMonth: string;
  rangeStart: string;
  rangeEnd: string;
  min: string;
  max: string;
  locale: Locale;
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
  onSelect,
  onHover,
}: DayGridProps) {
  const firstDay = monthUtils.firstDayOfMonth(`${viewMonth}-01`);
  const lastDay = monthUtils.lastDayOfMonth(`${viewMonth}-01`);
  const days = monthUtils.dayRangeInclusive(firstDay, lastDay);
  const currentDay = monthUtils.currentDay();
  // Weekday of the 1st (0 = Sunday) so the grid lines up under its headers.
  const leadingBlanks = new Date(`${firstDay}T00:00:00`).getDay();

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
            {/* 2021-01-03 is a Sunday; label the weekday headers from it. */}
            {monthUtils.format(
              monthUtils.addDays('2021-01-03', i),
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
              disabled={day < min || day > max}
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
