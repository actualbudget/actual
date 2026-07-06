import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { Locale } from 'date-fns';

import { Grid } from './Grid';
import { GridButton } from './GridButton';

type DayGridProps = {
  viewMonth: string;
  value: string;
  min: string;
  max: string;
  locale: Locale;
  onSelect: (day: string) => void;
};

export function DayGrid({
  viewMonth,
  value,
  min,
  max,
  locale,
  onSelect,
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
        {days.map(day => (
          <GridButton
            key={day}
            selected={day === value}
            disabled={day < min || day > max}
            isToday={day === currentDay}
            onSelect={() => onSelect(day)}
          >
            {String(monthUtils.getDay(day))}
          </GridButton>
        ))}
      </Grid>
    </>
  );
}
