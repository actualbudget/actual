import React from 'react';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

import { type CSSProperties } from '../../../style';
import { Container } from '../Container';

export type barGraphBudgetCategory = {
  name: string;
  budget: number;
  spent: number;
  remaining: number | false;
  overBudget: number | false;
  carryover: number;
};
/*
type PayloadItem = {
  value: number;
  payload: {
    name: string;
    budget: number;
    spent: number;
    remaining: number;
    overBudget: number;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
};
const BarWithBorder = (borderHeight, borderColor) => {
  return props => {
    const { fill, x, y, width, height } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke="none"
          fill={fill}
        />
        <rect
          x={x}
          y={y}
          width={borderHeight}
          height={height}
          stroke="none"
          fill={borderColor}
        />
      </g>
    );
  };
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
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}`}
      >
        <div>
          <div>
            <strong>{label}</strong>
          </div>
          <div style={{ lineHeight: 1.4 }}>
            <AlignedText
              left="Budget:"
              right={payload[0].payload.budget}
              style={{
                fontWeight: 600,
              }}
            />
            {!payload[0].payload.overBudget && (
              <AlignedText
                left="Spent:"
                right={payload[0].payload.spent}
                style={{
                  fontWeight: 600,
                }}
              />
            )}
            <AlignedText
              left={payload[0].payload.overBudget > 0 ? 'Over:' : 'Remaining:'}
              right={
                payload[0].payload.overBudget > 0
                  ? payload[0].payload.overBudget
                  : payload[0].payload.remaining
              }
              style={{
                fontWeight: 600,
              }}
            />
          </div>
        </div>
      </div>
    );
  }
};
*/
type BarGraphVerticalProps = {
  style?: CSSProperties;
  data: barGraphBudgetCategory[];
};

export function BarGraphVertical({ style, data }: BarGraphVerticalProps) {
  //const privacyMode = usePrivacyMode();

  return (
    <Container
      style={{
        height: 'auto',
        ...style,
      }}
    >
      {(width, height) =>
        data && (
          <ResponsiveContainer>
            <BarChart
              width={width}
              height={height}
              data={data}
              layout="vertical"
              stackOffset="expand"
              barCategoryGap={0}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 5,
              }}
            >
              <XAxis hide type="number" axisLine={false} display="none" />
              <YAxis type="category" hide />
              <Bar
                dataKey={val => Math.abs(val.spent)}
                stackId="a"
                fill="#8884d8"
                isAnimationActive={false}
                radius={[10, 10, 10, 10]}
              />
              <Bar
                dataKey={val => Math.abs(val.remaining)}
                stackId="a"
                fill="#82ca9d"
                isAnimationActive={false}
                radius={[10, 10, 10, 10]}
              />
              <Bar
                dataKey={val => Math.abs(val.overBudget)}
                stackId="a"
                fill="red"
                isAnimationActive={false}
                radius={[10, 10, 10, 10]}
              />
              <Bar
                dataKey={val => Math.abs(val.carryover)}
                stackId="a"
                fill="black"
                isAnimationActive={false}
                radius={[10, 10, 10, 10]}
              />
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
