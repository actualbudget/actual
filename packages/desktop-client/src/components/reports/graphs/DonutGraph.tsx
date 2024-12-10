// @ts-strict-ignore
import React, { useState, type CSSProperties } from 'react';

import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';

import { amountToCurrency } from 'loot-core/src/shared/util';
import {
  type balanceTypeOpType,
  type DataEntity,
} from 'loot-core/src/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useNavigate } from '../../../hooks/useNavigate';
import { theme } from '../../../style';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Container } from '../Container';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

const RADIAN = Math.PI / 180;

const ActiveShapeMobile = props => {
  const {
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
  } = props;
  const yAxis = payload.name ?? payload.date;

  const sin = Math.sin(-RADIAN * 240);
  const my = cy + outerRadius * sin;
  const ey = my - 5;

  return (
    <g>
      <text
        x={cx}
        y={cy + outerRadius * Math.sin(-RADIAN * 270) + 15}
        dy={0}
        textAnchor="middle"
        fill={fill}
      >
        {`${yAxis}`}
      </text>
      <PrivacyFilter>
        <text
          x={cx + outerRadius * Math.cos(-RADIAN * 240) - 30}
          y={ey}
          dy={0}
          textAnchor="end"
          fill={fill}
        >
          {`${amountToCurrency(value)}`}
        </text>
        <text
          x={cx + outerRadius * Math.cos(-RADIAN * 330) + 10}
          y={ey}
          dy={0}
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
        innerRadius={innerRadius - 8}
        outerRadius={innerRadius - 6}
        fill={fill}
      />
    </g>
  );
};

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
      <PrivacyFilter>
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
      </PrivacyFilter>
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
  const textSize = adjustTextSize({ sized: size, type: 'donut' });
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
  data: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  balanceTypeOp: balanceTypeOpType;
  viewLabels: boolean;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTooltip?: boolean;
};

export function DonutGraph({
  style,
  data,
  filters,
  groupBy,
  balanceTypeOp,
  viewLabels,
  showHiddenCategories,
  showOffBudget,
  showTooltip = true,
}: DonutGraphProps) {
  const yAxis = groupBy === 'Interval' ? 'date' : 'name';
  const splitData = groupBy === 'Interval' ? 'intervalData' : 'data';

  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const [pointer, setPointer] = useState('');

  const getVal = (obj: DataEntity) => {
    if (['totalDebts', 'netDebts'].includes(balanceTypeOp)) {
      return -1 * obj[balanceTypeOp];
    } else {
      return obj[balanceTypeOp];
    }
  };

  const [activeIndex, setActiveIndex] = useState(0);

  // Sort the data in the pie chart
  const unsortedData = data[splitData];
  const sortedData = unsortedData.slice().sort((a, b) => getVal(b) - getVal(a));

  return (
    <Container style={style}>
      {(width, height) => {
        const compact = height <= 300 || width <= 300;

        return (
          sortedData && (
            <ResponsiveContainer>
              <div>
                {!compact && <div style={{ marginTop: '15px' }} />}
                <PieChart
                  width={width}
                  height={height}
                  style={{ cursor: pointer }}
                >
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={
                      width < 220 || height < 130
                        ? undefined
                        : compact
                          ? ActiveShapeMobile
                          : ActiveShape
                    }
                    dataKey={val => getVal(val)}
                    nameKey={yAxis}
                    isAnimationActive={false}
                    data={sortedData}
                    innerRadius={Math.min(width, height) * 0.2}
                    fill="#8884d8"
                    labelLine={false}
                    label={e =>
                      viewLabels && !compact ? customLabel(e) : <div />
                    }
                    startAngle={90}
                    endAngle={-270}
                    onMouseLeave={() => setPointer('')}
                    onMouseEnter={(_, index) => {
                      setActiveIndex(index);
                      if (!['Group', 'Interval'].includes(groupBy)) {
                        setPointer('pointer');
                      }
                    }}
                    onClick={item =>
                      ((compact && showTooltip) || !compact) &&
                      !['Group', 'Interval'].includes(groupBy) &&
                      showActivity({
                        navigate,
                        categories,
                        accounts,
                        balanceTypeOp,
                        filters,
                        showHiddenCategories,
                        showOffBudget,
                        type: 'totals',
                        startDate: data.startDate,
                        endDate: data.endDate,
                        field: groupBy.toLowerCase(),
                        id: item.id,
                      })
                    }
                  >
                    {data.legend.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
            </ResponsiveContainer>
          )
        );
      }}
    </Container>
  );
}
