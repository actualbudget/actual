import { useState } from 'react';

import { View } from '#View';

import { MonthGrid } from './MonthGrid';
import { NavRow } from './NavRow';
import { getYear } from './util';
import type { DateRangePickerLabels } from './util';

type RangeSelectorProps = {
  /** Inclusive month-shaped (`yyyy-MM`) range and bounds. */
  start: string;
  end: string;
  min: string;
  max: string;
  locale: string;
  labels: Pick<DateRangePickerLabels, 'previous' | 'next'>;
  onChange: (start: string, end: string) => void;
};

/** Month grid for picking a range: one click anchors, a second click sets the other end. */
export function RangeSelector({
  start,
  end,
  min,
  max,
  locale,
  labels,
  onChange,
}: RangeSelectorProps) {
  const [viewYear, setViewYear] = useState(() => getYear(start));

  // When the range changes from outside (e.g. a quick-select preset) and the
  // shown year no longer touches it, jump to the range's start.
  const [prevRange, setPrevRange] = useState([start, end]);
  if (start !== prevRange[0] || end !== prevRange[1]) {
    setPrevRange([start, end]);
    if (viewYear < getYear(start) || viewYear > getYear(end)) {
      setViewYear(getYear(start));
    }
  }

  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverValue, setHoverValue] = useState<string | null>(null);

  function pick(cell: string) {
    if (anchor == null) {
      setAnchor(cell);
      onChange(cell, cell);
    } else {
      const [newStart, newEnd] =
        cell < anchor ? [cell, anchor] : [anchor, cell];
      onChange(newStart, newEnd);
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

  return (
    <View onMouseLeave={() => setHoverValue(null)} style={{ minWidth: 180 }}>
      <NavRow
        label={viewYear}
        previousLabel={labels.previous}
        nextLabel={labels.next}
        canPrev={viewYear > getYear(min)}
        canNext={viewYear < getYear(max)}
        onPrev={() => setViewYear(String(Number(viewYear) - 1))}
        onNext={() => setViewYear(String(Number(viewYear) + 1))}
      />

      <MonthGrid
        year={viewYear}
        rangeStart={bandStart}
        rangeEnd={bandEnd}
        minMonth={min}
        maxMonth={max}
        locale={locale}
        onSelect={pick}
        onHover={anchor ? setHoverValue : undefined}
      />
    </View>
  );
}
