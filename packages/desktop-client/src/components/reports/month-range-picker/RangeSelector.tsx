import { useState } from 'react';

import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import type { Locale } from 'date-fns';

import { DayGrid } from './DayGrid';
import { MonthGrid } from './MonthGrid';
import { NavRow } from './NavRow';
import { clamp, toMonth } from './util';

type RangeSelectorProps = {
  start: string;
  end: string;
  /** Inclusive bound of the same granularity as `start`/`end`. */
  min: string;
  max: string;
  isDay: boolean;
  locale: Locale;
  /** First day of week for the day grid; defaults to Sunday. */
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onChange: (start: string, end: string) => void;
};

/** Calendar grid for picking a range: one click anchors, a second click sets the other end. */
export function RangeSelector({
  start,
  end,
  min,
  max,
  isDay,
  locale,
  firstDayOfWeekIdx,
  onChange,
}: RangeSelectorProps) {
  const minMonth = toMonth(min);
  const maxMonth = toMonth(max);

  const [viewMonth, setViewMonth] = useState(() => toMonth(start));
  const viewYear = monthUtils.getYear(viewMonth);

  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverValue, setHoverValue] = useState<string | null>(null);

  function pick(cell: string) {
    if (anchor == null) {
      setAnchor(cell);
      onChange(cell, cell);
    } else {
      const [newStart, newEnd] =
        cell < anchor ? [cell, anchor] : [anchor, cell];
      onChange(clamp(newStart, min, max), clamp(newEnd, min, max));
      setAnchor(null);
      setHoverValue(null);
    }
  }

  // While picking a second end, preview the band against the hovered cell.
  const previewCell = hoverValue ?? anchor;
  const [bandStart, bandEnd] =
    anchor != null && previewCell != null
      ? previewCell < anchor
        ? [previewCell, anchor]
        : [anchor, previewCell]
      : [start, end];

  const prevMonth = monthUtils.prevMonth(viewMonth);
  const nextMonth = monthUtils.nextMonth(viewMonth);
  const prevYear = monthUtils.subYears(viewMonth, 1);
  const nextYear = monthUtils.addYears(viewMonth, 1);

  return (
    <View
      onMouseLeave={() => setHoverValue(null)}
      style={{ minWidth: isDay ? 220 : 180 }}
    >
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
          rangeStart={bandStart}
          rangeEnd={bandEnd}
          min={min}
          max={max}
          locale={locale}
          firstDayOfWeekIdx={firstDayOfWeekIdx}
          onSelect={pick}
          onHover={anchor ? setHoverValue : undefined}
        />
      ) : (
        <MonthGrid
          year={viewYear}
          rangeStart={bandStart}
          rangeEnd={bandEnd}
          minMonth={minMonth}
          maxMonth={maxMonth}
          locale={locale}
          onSelect={pick}
          onHover={anchor ? setHoverValue : undefined}
        />
      )}
    </View>
  );
}
