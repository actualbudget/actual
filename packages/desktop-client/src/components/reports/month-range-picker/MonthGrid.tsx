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
  /** Notified on pointer-enter of a cell, to preview the range band while
   * picking the second endpoint. Omitted when there's no anchor to preview
   * against. */
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
  return (
    <Grid columns={4}>
      {Array.from({ length: 12 }, (_, i) => {
        const month = monthUtils.getMonthFromIndex(year, i);
        const disabled = month < minMonth || month > maxMonth;
        const position = rangePosition(month, rangeStart, rangeEnd);
        return (
          <GridButton
            key={month}
            selected={month === rangeStart || month === rangeEnd}
            disabled={disabled}
            isToday={month === currentMonth}
            inRange={position != null}
            rangeEdge={
              position === 'middle' || position == null ? undefined : position
            }
            onSelect={() => onSelect(month)}
            onHover={onHover ? () => onHover(month) : undefined}
          >
            {monthUtils.format(month, 'MMM', locale)}
          </GridButton>
        );
      })}
    </Grid>
  );
}
