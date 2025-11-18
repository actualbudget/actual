// @ts-strict-ignore
import React, { useState, type CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import { PieChart, Pie, Cell, Sector, Tooltip } from 'recharts';

import {
  type balanceTypeOpType,
  type DataEntity,
  type GroupedEntity,
  type IntervalEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

const RADIAN = Math.PI / 180;

const canDeviceHover = () => window.matchMedia('(hover: hover)').matches;

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
    format,
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
          {`${format(value, 'financial')}`}
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

const ActiveShapeMobileWithFormat = props => (
  <ActiveShapeMobile {...props} format={props.format} />
);

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
    format,
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
        >{`${format(value, 'financial')}`}</text>
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

const ActiveShapeWithFormat = props => (
  <ActiveShape {...props} format={props.format} />
);

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
  const format = useFormat();
  const animationProps = useRechartsAnimation({ isAnimationActive: false });

  const yAxis = groupBy === 'Interval' ? 'date' : 'name';
  const splitData = groupBy === 'Interval' ? 'intervalData' : 'data';

  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const [pointer, setPointer] = useState('');

  const getVal = (obj: GroupedEntity | IntervalEntity) => {
    if (['totalDebts', 'netDebts'].includes(balanceTypeOp)) {
      return -1 * obj[balanceTypeOp];
    } else {
      return obj[balanceTypeOp];
    }
  };

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Container style={style}>
      {(width, height) => {
        const compact = height <= 300 || width <= 300;

        return (
          data[splitData] && (
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <PieChart
                responsive
                width={width}
                height={height}
                style={{ cursor: pointer }}
              >
                <Pie
                  activeShape={
                    width < 220 || height < 130
                      ? undefined
                      : compact
                        ? props => (
                            <ActiveShapeMobileWithFormat
                              {...props}
                              format={format}
                            />
                          )
                        : props => (
                            <ActiveShapeWithFormat {...props} format={format} />
                          )
                  }
                  dataKey={val => getVal(val)}
                  nameKey={yAxis}
                  {...animationProps}
                  data={
                    data[splitData]?.map(item => ({
                      ...item,
                    })) ?? []
                  }
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
                    if (canDeviceHover()) {
                      setActiveIndex(index);
                      if (!['Group', 'Interval'].includes(groupBy)) {
                        setPointer('pointer');
                      }
                    }
                  }}
                  onClick={(item, index) => {
                    if (!canDeviceHover()) {
                      setActiveIndex(index);
                    }

                    if (
                      !['Group', 'Interval'].includes(groupBy) &&
                      (canDeviceHover() || activeIndex === index) &&
                      ((compact && showTooltip) || !compact)
                    ) {
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
                      });
                    }
                  }}
                >
                  {data.legend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={() => null}
                  defaultIndex={activeIndex}
                  active={true}
                />
              </PieChart>
            </div>
          )
        );
      }}
    </Container>
  );
}
