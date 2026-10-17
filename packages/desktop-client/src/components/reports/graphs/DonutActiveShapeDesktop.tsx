import React, { useLayoutEffect, useRef, useState } from 'react';

import { Sector } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import type { DonutActiveShapeProps } from './donutActiveShapeProps';

const RADIAN = Math.PI / 180;

// Rough sizes for a label before it's first drawn and measured: the average
// width of a character, and its extent from above the name to below the
// percent row, relative to the name's baseline
const ESTIMATED_CHAR_WIDTH = 7;
const ESTIMATED_LABEL_TOP = -12;
const ESTIMATED_LABEL_HEIGHT = 52;

const DOT_RADIUS = 3;
// The gaps between the label and a dot beside it, or above or under it
const SIDE_DOT_GAP = 10;
const DOT_GAP = 8;
// How far a dot beside the label stays clear of the hole's edge, or of a
// highlight drawn inside it
const DOT_EDGE_CLEARANCE = 6;

// The label's size, with its top relative to the name's baseline
type LabelBox = { width: number; top: number; height: number };

/**
 * The highlight drawn over a donut's hovered sector, with a line out to its
 * label.
 */
export function DonutActiveShapeDesktop({
  cx,
  cy,
  midAngle,
  outerRadius,
  startAngle,
  endAngle,
  fill,
  payload,
  percent,
  value,
  expandInward,
  chartInnerRadius,
  valueText,
  change,
  highlightOpacity,
}: DonutActiveShapeProps) {
  const format = useFormat();
  const labelRef = useRef<SVGGElement>(null);
  const [measuredBox, setMeasuredBox] = useState<LabelBox>();
  // Fix 2: guard against undefined payload.name  and payload.date
  const yAxis = payload.name ?? payload.date ?? '';
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  const expansionInner = expandInward ? chartInnerRadius - 10 : outerRadius + 6;
  const expansionOuter = expandInward ? chartInnerRadius - 6 : outerRadius + 10;

  const lineStart = expandInward
    ? chartInnerRadius - 20
    : chartInnerRadius - 10;
  const lineMid = chartInnerRadius * 0.7;
  const sx = cx + lineStart * cos;
  const sy = cy + lineStart * sin;
  const mx = cx + lineMid * cos;
  const my = cy + lineMid * sin;
  const valueRow = valueText ?? format(value, 'financial');
  const changeRow = change ? ` (${change.text})` : '';
  const percentRow = `(${(percent * 100).toFixed(2)}%)`;

  const box = measuredBox ?? {
    width:
      Math.max(
        yAxis.length,
        valueRow.length + changeRow.length,
        percentRow.length,
      ) * ESTIMATED_CHAR_WIDTH,
    top: ESTIMATED_LABEL_TOP,
    height: ESTIMATED_LABEL_HEIGHT,
  };

  // The label's size is only known once it's drawn. The rows are drawn from
  // the name's baseline inside a moved group, so they measure the same
  // wherever the label goes. This runs before the browser paints, so the
  // estimated position is never seen.
  useLayoutEffect(() => {
    const measured = labelRef.current?.getBBox();
    if (measured) {
      setMeasuredBox({
        width: measured.width,
        top: measured.y,
        height: measured.height,
      });
    }
  }, [yAxis, valueRow, changeRow, percentRow]);

  // The label is centred in the hole. It's wider than it's tall, so there's
  // more room above and below it than beside it: sectors in the top or bottom
  // third get a straight line to a dot above or under the label, which is
  // centred. Sectors to the sides get a dot just past the label's edge, level
  // with the name, and the label is aligned towards them.
  const side = cos < 0 ? -1 : 1;
  const isAbove = sin < -0.5;
  const isBelow = sin > 0.5;
  const isVertical = isAbove || isBelow;
  const textY = cy - box.top - box.height / 2;

  // A dot beside the label is centred with it, but kept inside the hole and
  // clear of a highlight drawn there. A wide label moves in to keep its gap.
  const holeEdge = expandInward ? chartInnerRadius - 10 : chartInnerRadius;
  const maxDotDistance = holeEdge - DOT_EDGE_CLEARANCE - DOT_RADIUS;
  const maxDotOffset = Math.sqrt(
    Math.max(maxDotDistance ** 2 - (textY - cy) ** 2, 0),
  );
  const sideDotOffset = Math.min(
    (box.width + SIDE_DOT_GAP + DOT_RADIUS) / 2 - DOT_RADIUS,
    maxDotOffset,
  );
  const sideDotX = cx + side * sideDotOffset;

  const textAnchor = isVertical ? 'middle' : side < 0 ? 'start' : 'end';
  const labelX = isVertical ? cx : sideDotX - side * SIDE_DOT_GAP;
  const ex = isVertical ? cx : sideDotX;
  const ey = isAbove
    ? textY + box.top - DOT_GAP
    : isBelow
      ? textY + box.top + box.height + DOT_GAP
      : textY;

  // Lines to a dot above or under the label bend where they reach its height
  // and run flat into it, clear of the label: straight for sectors pointing
  // straight up or down, with a longer flat run the further a sector is off
  // to the side. Lines to a dot beside the label bend partway across the hole.
  const elbowDistance = Math.min(Math.max((ey - cy) / sin, 0), lineStart);
  const elbowX = isVertical ? cx + elbowDistance * cos : mx;
  const elbowY = isVertical ? cy + elbowDistance * sin : my;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={expansionInner}
        outerRadius={expansionOuter}
        fill={fill}
        fillOpacity={highlightOpacity}
      />
      <path
        d={`M${sx},${sy}L${elbowX},${elbowY}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={DOT_RADIUS} fill={fill} stroke="none" />
      <g ref={labelRef} transform={`translate(0, ${textY})`}>
        <text x={labelX} y={0} textAnchor={textAnchor} fill={fill}>
          {yAxis}
        </text>
        <PrivacyFilter>
          <FinancialText
            as="text"
            x={labelX}
            y={0}
            dy={18}
            textAnchor={textAnchor}
            fill={fill}
          >
            {valueRow}
            {change && <tspan fill={change.color}>{changeRow}</tspan>}
          </FinancialText>
          <text x={labelX} y={0} dy={36} textAnchor={textAnchor} fill="#999">
            {percentRow}
          </text>
        </PrivacyFilter>
      </g>
    </g>
  );
}
