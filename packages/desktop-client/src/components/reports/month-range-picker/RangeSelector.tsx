import { useState } from 'react';

import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { Locale } from 'date-fns';

import { MonthGrid } from './MonthGrid';
import { NavRow } from './NavRow';

type RangeSelectorProps = {
  /** Inclusive month-shaped (`yyyy-MM`) range and bounds. */
  start: string;
  end: string;
  min: string;
  max: string;
  locale: Locale;
  onChange: (start: string, end: string) => void;
};

/** Month grid for picking a range: one click anchors, a second click sets the other end. */
export function RangeSelector({
  start,
  end,
  min,
  max,
  locale,
  onChange,
}: RangeSelectorProps) {
  const [viewYear, setViewYear] = useState(() => monthUtils.getYear(start));

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
        canPrev={viewYear > monthUtils.getYear(min)}
        canNext={viewYear < monthUtils.getYear(max)}
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
