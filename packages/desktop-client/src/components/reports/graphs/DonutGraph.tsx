// @ts-strict-ignore
import React, { useState } from 'react';

import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';

import { amountToCurrency } from 'loot-core/src/shared/util';
import { type DataEntity } from 'loot-core/src/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useNavigate } from '../../../hooks/useNavigate';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, type CSSProperties } from '../../../style';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Container } from '../Container';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';

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

  return (
    <g>
      <text x={cx} y={cy + 70} dy={-8} textAnchor="middle" fill={fill}>
        {`${yAxis}`}
      </text>
      <PrivacyFilter>
        <text x={cx - 40} y={cy + 40} dy={0} textAnchor="end" fill={fill}>
          {`${amountToCurrency(value)}`}
        </text>
        <text x={cx + 45} y={cy + 40} dy={0} textAnchor="start" fill="#999">
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
  balanceTypeOp: string;
  compact?: boolean;
  viewLabels: boolean;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export function DonutGraph({
  style,
  data,
  filters,
  groupBy,
  balanceTypeOp,
  compact,
  viewLabels,
  showHiddenCategories,
  showOffBudget,
}: DonutGraphProps) {
  const yAxis = groupBy === 'Interval' ? 'date' : 'name';
  const splitData = groupBy === 'Interval' ? 'intervalData' : 'data';

  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const { isNarrowWidth } = useResponsive();
  const [pointer, setPointer] = useState('');

  const onShowActivity = item => {
    const amount = balanceTypeOp === 'totalDebts' ? 'lte' : 'gte';
    const field = groupBy === 'Interval' ? null : groupBy.toLowerCase();
    const hiddenCategories = categories.list
      .filter(f => f.hidden)
      .map(e => e.id);
    const offBudgetAccounts = accounts.filter(f => f.offbudget).map(e => e.id);

    const conditions = [
      ...filters,
      { field, op: 'is', value: item.id, type: 'id' },
      {
        field: 'date',
        op: 'gte',
        value: data.startDate,
        options: { date: true },
        type: 'date',
      },
      {
        field: 'date',
        op: 'lte',
        value: data.endDate,
        options: { date: true },
        type: 'date',
      },
      balanceTypeOp !== 'totalTotals' && {
        field: 'amount',
        op: amount,
        value: 0,
        type: 'number',
      },
      hiddenCategories.length > 0 &&
        !showHiddenCategories && {
          field: 'category',
          op: 'notOneOf',
          value: hiddenCategories,
          type: 'id',
        },
      offBudgetAccounts.length > 0 &&
        !showOffBudget && {
          field: 'account',
          op: 'notOneOf',
          value: offBudgetAccounts,
          type: 'id',
        },
    ].filter(f => f);
    navigate('/accounts', {
      state: {
        goBack: true,
        conditions,
        categoryId: item.id,
      },
    });
  };

  const getVal = obj => {
    if (balanceTypeOp === 'totalDebts') {
      return -1 * obj[balanceTypeOp];
    } else {
      return obj[balanceTypeOp];
    }
  };

  const [activeIndex, setActiveIndex] = useState(0);

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
              <PieChart
                width={width}
                height={height}
                style={{ cursor: pointer }}
              >
                <Pie
                  activeIndex={activeIndex}
                  activeShape={compact ? ActiveShapeMobile : ActiveShape}
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
                  onMouseLeave={() => setPointer('')}
                  onMouseEnter={(_, index) => {
                    setActiveIndex(index);
                    if (!['Group', 'Interval'].includes(groupBy)) {
                      setPointer('pointer');
                    }
                  }}
                  onClick={
                    !isNarrowWidth &&
                    !['Group', 'Interval'].includes(groupBy) &&
                    onShowActivity
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
      }
    </Container>
  );
}
