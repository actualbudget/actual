import React from 'react';
import type { ReactNode } from 'react';

import { Sector } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';

type DonutSectorProps = {
  sector: PieSectorShapeProps;
  fill: string;
  fillOpacity?: number;
  stroke?: string;
  // Drawn over the sector while it's hovered
  highlight?: ReactNode;
};

/**
 * A donut sector, with its highlight added beside it rather than replacing
 * it. Swapping the element under the pointer loses the next mouseenter in
 * Firefox, so the highlight never follows a slow move to the next sector.
 */
export function DonutSector({
  sector,
  fill,
  fillOpacity,
  stroke,
  highlight,
}: DonutSectorProps) {
  return (
    <g>
      <Sector
        {...sector}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke ?? sector.stroke}
      />
      {highlight}
    </g>
  );
}
