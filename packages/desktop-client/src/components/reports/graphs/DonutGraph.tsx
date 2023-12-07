import React, { useState } from 'react';

import {
  PieChart,
  Pie,
  Cell,
  Sector,
  //Legend,
  //Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { type CSSProperties } from '../../../style';
import { getColorScale } from '../chart-theme';
import Container from '../Container';

import adjustTextSize from './adjustTextSize';

/*
type PayloadItem = {
  name: string;
  value: string;
  color: string;
  payload: {
    date: string;
    assets: number | string;
    debt: number | string;
    networth: number | string;
    change: number | string;
    fill: string;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={`${css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuAutoCompleteBackground,
          color: theme.menuAutoCompleteText,
          padding: 10,
        })}`}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>{payload[0].name}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <PrivacyFilter>
              <Text style={{ color: payload[0].payload.fill }}>
                {amountToCurrency(payload[0].value)}
              </Text>
            </PrivacyFilter>
          </div>
        </div>
      </div>
    );
  }
};
*/

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
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (innerRadius - 10) * cos;
  const sy = cy + (innerRadius - 10) * sin;
  const mx = cx + (innerRadius - 30) * cos;
  const my = cy + (innerRadius - 30) * sin;
  const ex = cx + (cos >= 0 ? 1 : -1) * payload.name.length * 4;
  const ey = cy + 8;
  //const ex = mx + (cos <= 0 ? 1 : -1) * 40;
  //const ey = my + (sin <= 0 ? 1 : -1) * 40;
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
      >{`${payload.name}`}</text>
      <text
        x={ex + (cos <= 0 ? 1 : -1) * 16}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill={fill}
      >{`${value.toFixed(2)}`}</text>
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

const CustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const size = cx > cy ? cy : cx;

  return percent > 0.05 ? (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={adjustTextSize(size)}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : (
    <text />
  );
};

/* Descoped for future PR
type CustomLegendProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
};

const CustomLegend = ({ active, payload, label }: CustomLegendProps) => {
  const agg = payload.map(leg => {
    return {
      name: leg.value,
      color: leg.color,
    };
  });

  OnChangeLegend(agg);

  return <div />;
};
*/

type DonutGraphProps = {
  style?: CSSProperties;
  data;
  groupBy: string;
  balanceTypeOp: string;
  empty: boolean;
  compact?: boolean;
  viewLabels: boolean;
};

function DonutGraph({
  style,
  data,
  groupBy,
  empty,
  balanceTypeOp,
  compact,
  viewLabels,
}: DonutGraphProps) {
  const colorScale = getColorScale('qualitative');
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
      {(width, height, portalHost) =>
        data[splitData] && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <PieChart width={width} height={height}>
                {
                  //<Legend content={<CustomLegend />} />
                }
                <Pie
                  activeIndex={activeIndex}
                  activeShape={ActiveShape}
                  dataKey={val => getVal(val)}
                  nameKey={yAxis}
                  isAnimationActive={false}
                  labelLine={false}
                  label={viewLabels && CustomLabel}
                  data={data[splitData].filter(i =>
                    !empty ? i[balanceTypeOp] !== 0 : true,
                  )}
                  innerRadius={Math.min(width, height) * 0.2}
                  fill="#8884d8"
                  onMouseEnter={onPieEnter}
                >
                  {data[splitData].map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colorScale[index % colorScale.length]}
                    />
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

export default DonutGraph;
