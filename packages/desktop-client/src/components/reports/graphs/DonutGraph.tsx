// @ts-strict-ignore
import React, { useState } from 'react';

import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';

import { amountToCurrency } from 'loot-core/src/shared/util';
import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { theme, type CSSProperties } from '../../../style';
import { Container } from '../Container';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';

const RADIAN = Math.PI / 180;
const ActiveShape = props => {
  const {
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
  } = props;
  const yAxis = payload.name ?? payload.date;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (innerRadius - 10) * cos;
  const sy = cy + (innerRadius - 10) * sin;
  const mx = cx + (innerRadius - 30) * cos;
  const my = cy + (innerRadius - 30) * sin;
  const ex = cx + (cos >= 0 ? 1 : -1) * yAxis.length * 4;
  const ey = cy + 8;
  const textAnchor = cos <= 0 ? 'start' : 'end';

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
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
      <text
        x={ex + (cos <= 0 ? 1 : -1) * 16}
        y={ey}
        textAnchor={textAnchor}
        fill={fill}
      >{`${yAxis}`}</text>
      <text
        x={ex + (cos <= 0 ? 1 : -1) * 16}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill={fill}
      >{`${amountToCurrency(value)}`}</text>
      <text
        x={ex + (cos <= 0 ? 1 : -1) * 16}
        y={ey}
        dy={36}
        textAnchor={textAnchor}
        fill="#999"
      >
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

const customLabel = props => {
  const radius =
    props.innerRadius + (props.outerRadius - props.innerRadius) * 0.5;
  const size = props.cx > props.cy ? props.cy : props.cx;

  const calcX = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
  const calcY = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
  const textAnchor = calcX > props.cx ? 'start' : 'end';
  const display = props.value !== 0 && `${(props.percent * 100).toFixed(0)}%`;
  const textSize = adjustTextSize(size, 'donut');
  const showLabel = props.percent;
  const showLabelThreshold = 0.05;
  const fill = theme.reportsInnerLabel;

  return renderCustomLabel(
    calcX,
    calcY,
    textAnchor,
    display,
    textSize,
    showLabel,
    showLabelThreshold,
    fill,
  );
};

type DonutGraphProps = {
  style?: CSSProperties;
  data: GroupedEntity;
  groupBy: string;
  balanceTypeOp: string;
  compact?: boolean;
  viewLabels: boolean;
};

export function DonutGraph({
  style,
  data,
  groupBy,
  balanceTypeOp,
  compact,
  viewLabels,
}: DonutGraphProps) {
  const yAxis = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';
  const splitData = ['Month', 'Year'].includes(groupBy) ? 'monthData' : 'data';

  const getVal = obj => {
    if (balanceTypeOp === 'totalDebts') {
      return -1 * obj[balanceTypeOp];
    } else {
      return obj[balanceTypeOp];
    }
  };

  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data[splitData] && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <PieChart width={width} height={height}>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={ActiveShape}
                  dataKey={val => getVal(val)}
                  nameKey={yAxis}
                  isAnimationActive={false}
                  data={data[splitData]}
                  innerRadius={Math.min(width, height) * 0.2}
                  fill="#8884d8"
                  labelLine={false}
                  label={e =>
                    viewLabels && !compact ? customLabel(e) : <div />
                  }
                  onMouseEnter={onPieEnter}
                >
                  {data.legend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
