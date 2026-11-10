import React from 'react';

import { Sector } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import type { DonutActiveShapeProps } from './donutActiveShapeProps';

const RADIAN = Math.PI / 180;

/**
 * The highlight drawn over a donut's hovered sector, with a line out to its
 * label.
 */
export function DonutActiveShapeDesktop({
  cx,
  cy,
  midAngle,
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
}: DonutActiveShapeProps) {
  const format = useFormat();
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
  const ex = cx + (cos >= 0 ? 1 : -1) * yAxis.length * 4;
  const ey = cy + 8;
  const textAnchor = cos <= 0 ? 'start' : 'end';
  const labelX = ex + (cos <= 0 ? 1 : -1) * 16;

  return (
    <g>
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
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
      <text x={labelX} y={ey} textAnchor={textAnchor} fill={fill}>
        {yAxis}
      </text>
      <PrivacyFilter>
        <FinancialText
          as="text"
          x={labelX}
          y={ey}
          dy={18}
          textAnchor={textAnchor}
          fill={fill}
        >
          {format(value, 'financial')}
        </FinancialText>
        <text x={labelX} y={ey} dy={36} textAnchor={textAnchor} fill="#999">
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
      </PrivacyFilter>
    </g>
  );
}
