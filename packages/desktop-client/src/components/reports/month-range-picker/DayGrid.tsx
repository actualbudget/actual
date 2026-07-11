import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
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
  /** First day of week for header order and alignment; defaults to Sunday. */
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onSelect: (day: string) => void;
  /** Called on pointer-enter of a cell to preview the range band. */
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
  // Depends only on the view month/locale, so it caches across hover
  // re-renders.
  const days = monthUtils.dayRangeInclusive(firstDay, lastDay).map(day => ({
    day,
    fullLabel: monthUtils.format(day, 'PPPP', locale),
  }));
  const currentDay = monthUtils.currentDay();
  // 0 = Sunday ... 6 = Saturday
  const startOfWeek = parseInt(firstDayOfWeekIdx || '0', 10) || 0;
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
            {/* 2021-01-03 is a Sunday; offset by startOfWeek for header order */}
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
        {days.map(({ day, fullLabel }) => (
          <GridButton
            key={day}
            selected={day === rangeStart || day === rangeEnd}
            disabled={day < min || day > max}
            isToday={day === currentDay}
            position={rangePosition(day, rangeStart, rangeEnd)}
            label={fullLabel}
            onSelect={() => onSelect(day)}
            onHover={onHover ? () => onHover(day) : undefined}
          >
            {String(Number(day.slice(8)))}
          </GridButton>
        ))}
      </Grid>
    </>
  );
}
