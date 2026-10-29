import React from 'react';
import type { ReactNode } from 'react';

import { Sector, useIsTooltipActive } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';

type DonutSectorProps = {
  sector: PieSectorShapeProps;
  fill: string;
  // Names the sector while it's selected, so a tap can tell whether it
  // started on the selected sector
  selectionKey: string;
  // Selected until the first hover or tap. A Tooltip defaultIndex can't do
  // this on a chart with several rings, because it selects that index in
  // every ring.
  isDefault?: boolean;
  // Drawn over the sector while it's selected. The selected sector drops its
  // border, as it did when the highlight replaced it.
  renderHighlight?: () => ReactNode;
};

/**
 * A donut sector, with its highlight added beside it rather than replacing
 * it. Swapping the element under the pointer loses the next mouseenter in
 * Firefox, so the highlight never follows a slow move to the next sector.
 */
export function DonutSector({
  sector,
  fill,
  selectionKey,
  isDefault = false,
  renderHighlight,
}: DonutSectorProps) {
  // False until the first hover or tap, then kept on by the Tooltip's active
  const isTooltipActive = useIsTooltipActive();
  const isSelected = sector.isActive || (isDefault && !isTooltipActive);
  const highlight = isSelected ? renderHighlight?.() : null;

  return (
    <g data-donut-selected={isSelected ? selectionKey : undefined}>
      <Sector
        {...sector}
        fill={fill}
        stroke={highlight ? 'none' : sector.stroke}
      />
      {highlight}
    </g>
  );
}
