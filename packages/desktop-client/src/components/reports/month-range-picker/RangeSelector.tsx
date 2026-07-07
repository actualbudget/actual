import { useState } from 'react';

import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
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
  onChange: (start: string, end: string) => void;
};

/**
 * A single calendar grid for picking a start/end range: click a cell to begin
 * a new range (collapsed to that one cell), then click another cell to set
 * the other end. While picking the second end, hovering previews the band
 * that would result. Mirrors the click-drag range-picking pattern of a
 * typical date-range picker, but via two clicks (no native drag needed).
 */
export function RangeSelector({
  start,
  end,
  min,
  max,
  isDay,
  locale,
  onChange,
}: RangeSelectorProps) {
  const minMonth = toMonth(min);
  const maxMonth = toMonth(max);

  // The month whose grid is on screen. Starts on the range start's month but
  // can be navigated independently of the selection.
  const [viewMonth, setViewMonth] = useState(() => toMonth(start));
  const viewYear = monthUtils.getYear(viewMonth);

  // Set right after the user picks a new range start, so the *next* click
  // sets the other end instead of starting a fresh single-cell range. Cleared
  // once that second click lands.
  const [anchor, setAnchor] = useState<string | null>(null);
  // Cell currently under the pointer, for the live range-band preview while
  // an anchor is active. Ignored otherwise.
  const [hoverValue, setHoverValue] = useState<string | null>(null);

  function pick(cell: string) {
    if (anchor == null) {
      // First click of a new selection: collapse the range to this cell and
      // wait for the second click to expand it.
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

  // The band to paint: while picking a second end, preview it against the
  // hovered cell (falling back to the anchor itself); otherwise show the
  // committed range.
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
