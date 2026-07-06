import * as monthUtils from '@actual-app/core/shared/months';
import type { Locale } from 'date-fns';

import { Grid } from './Grid';
import { GridButton } from './GridButton';

type MonthGridProps = {
  year: string;
  selectedMonth: string;
  minMonth: string;
  maxMonth: string;
  locale: Locale;
  onSelect: (month: string) => void;
};

export function MonthGrid({
  year,
  selectedMonth,
  minMonth,
  maxMonth,
  locale,
  onSelect,
}: MonthGridProps) {
  const currentMonth = monthUtils.currentMonth();
  return (
    <Grid columns={4}>
      {Array.from({ length: 12 }, (_, i) => {
        const month = monthUtils.getMonthFromIndex(year, i);
        const disabled = month < minMonth || month > maxMonth;
        return (
          <GridButton
            key={month}
            selected={month === selectedMonth}
            disabled={disabled}
            isToday={month === currentMonth}
            onSelect={() => onSelect(month)}
          >
            {monthUtils.format(month, 'MMM', locale)}
          </GridButton>
        );
      })}
    </Grid>
  );
}
