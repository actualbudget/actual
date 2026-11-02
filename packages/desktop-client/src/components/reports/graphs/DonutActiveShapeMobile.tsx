import React from 'react';

import { Sector } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import type { DonutActiveShapeProps } from './donutActiveShapeProps';

const RADIAN = Math.PI / 180;

/**
 * The highlight and labels drawn over a donut's hovered sector on small
 * charts, labelled above and below.
 */
export function DonutActiveShapeMobile({
  cx,
  cy,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  fill,
  payload,
  percent,
  value,
  expandInward,
  chartInnerRadius,
  chartOuterRadius,
}: DonutActiveShapeProps) {
  const format = useFormat();
  // Fix 2: guard against undefined payload.name and payload.date
  const yAxis = payload.name ?? payload.date ?? '';

  const expansionInner = expandInward ? chartInnerRadius - 4 : outerRadius + 2;
  const expansionOuter = expandInward ? chartInnerRadius - 2 : outerRadius + 4;
  const ey = cy + chartOuterRadius * Math.sin(-RADIAN * 240) - 5;

  return (
    <g>
      <text
        x={cx}
        y={cy + chartOuterRadius * Math.sin(-RADIAN * 270) + 17}
        textAnchor="middle"
        fill={fill}
      >
        {yAxis}
      </text>
      <PrivacyFilter>
        <FinancialText
          as="text"
          x={cx + chartOuterRadius * Math.cos(-RADIAN * 240) - 30}
          y={ey}
          textAnchor="end"
          fill={fill}
        >
          {format(value, 'financial')}
        </FinancialText>
        <text
          x={cx + chartOuterRadius * Math.cos(-RADIAN * 330) + 10}
          y={ey}
          textAnchor="start"
          fill="#999"
        >
          {`${(percent * 100).toFixed(2)}%`}
        </text>
      </PrivacyFilter>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={expansionInner}
        outerRadius={expansionOuter}
        fill={fill}
      />
    </g>
  );
}
