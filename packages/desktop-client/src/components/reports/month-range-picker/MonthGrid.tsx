import * as monthUtils from '@actual-app/core/shared/months';
import type { Locale } from 'date-fns';

import { Grid } from './Grid';
import { GridButton } from './GridButton';
import { rangePosition } from './util';

type MonthGridProps = {
  year: string;
  rangeStart: string;
  rangeEnd: string;
  minMonth: string;
  maxMonth: string;
  locale: Locale;
  onSelect: (month: string) => void;
  /** Called on pointer-enter of a cell to preview the range band. */
  onHover?: (month: string) => void;
};

export function MonthGrid({
  year,
  rangeStart,
  rangeEnd,
  minMonth,
  maxMonth,
  locale,
  onSelect,
  onHover,
}: MonthGridProps) {
  const currentMonth = monthUtils.currentMonth();
  // Depends only on year/locale, so it caches across hover re-renders.
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = monthUtils.getMonthFromIndex(year, i);
    return { month, label: monthUtils.format(month, 'MMM', locale) };
  });
  return (
    <Grid columns={4}>
      {months.map(({ month, label }) => (
        <GridButton
          key={month}
          selected={month === rangeStart || month === rangeEnd}
          disabled={month < minMonth || month > maxMonth}
          isToday={month === currentMonth}
          position={rangePosition(month, rangeStart, rangeEnd)}
          onSelect={() => onSelect(month)}
          onHover={onHover ? () => onHover(month) : undefined}
        >
          {label}
        </GridButton>
      ))}
    </Grid>
  );
}
