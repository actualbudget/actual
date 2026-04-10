// @ts-strict-ignore
import React, { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  DataEntity,
  GroupedEntity,
  IntervalEntity,
  LegendEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { Pie, PieChart, Sector } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

const RADIAN = Math.PI / 180;

const canDeviceHover = () => window.matchMedia('(hover: hover)').matches;

// ---------------------------------------------------------------------------
// Dimension helpers
// ---------------------------------------------------------------------------

type DonutDimensions = {
  chartInnerRadius: number;
  chartMidRadius: number;
  chartOuterRadius: number;
  compact: boolean;
};

const getDonutDimensions = (
  width: number,
  height: number,
  twoRings: boolean,
): DonutDimensions => {
  const minDim = Math.min(width, height);
  const compact = height <= 300 || width <= 300;
  return {
    chartInnerRadius: minDim * (twoRings && compact ? 0.16 : 0.2),
    chartMidRadius: minDim * (compact ? 0.27 : 0.31),
    chartOuterRadius: minDim * (compact ? 0.36 : 0.42),
    compact,
  };
};

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const resolveCSSVariable = (color: string): string => {
  if (!color.startsWith('var(')) return color;
  const inner = color.slice(4, -1).trim();
  const varName = inner.split(',')[0].trim();
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const shadeColor = (resolvedHex: string, percent: number): string => {
  const { r, g, b } = hexToRgb(resolvedHex);
  const adjust = (c: number) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * percent)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
};

const buildColorMap = (
  groupedData: GroupedEntity[],
  legend: LegendEntity[],
): Map<string, string> => {
  const legendById = new Map(
    legend
      .filter(l => l.id != null)
      .map(l => [l.id, resolveCSSVariable(l.color)]),
  );

  return groupedData.reduce((acc, group) => {
    if (!group.id) return acc;

    const groupColor = legendById.get(group.id);
    if (!groupColor) return acc;

    acc.set(group.id, groupColor);

    // Fix 1: capture cats once to avoid group.categories.length on undefined
    const cats = group.categories ?? [];
    cats.forEach((cat, i) => {
      if (!cat.id) return;
      const shade = 0.15 + (i / Math.max(cats.length, 1)) * 0.5;
      acc.set(cat.id, shadeColor(groupColor, shade));
    });

    return acc;
  }, new Map<string, string>());
};

// ---------------------------------------------------------------------------
// Active shapes
// ---------------------------------------------------------------------------

type ActiveShapeProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: { name?: string; date?: string };
  percent: number;
  value: number;
  expandInward: boolean;
  chartInnerRadius: number;
  chartMidRadius: number;
  chartOuterRadius: number;
};

const ActiveShapeMobile = ({
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
}: ActiveShapeProps) => {
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
};

const ActiveShapeDesktop = ({
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
}: ActiveShapeProps) => {
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
};

// ---------------------------------------------------------------------------
// Custom label
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const animationProps = useRechartsAnimation({ isAnimationActive: false });

  const yAxis = groupBy === 'Interval' ? 'date' : 'name';
  const splitData = groupBy === 'Interval' ? 'intervalData' : 'data';

  const navigate = useNavigate();
  const { data: categories = { grouped: [], list: [] } } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const [pointer, setPointer] = useState('');

  const getVal = (obj: GroupedEntity | IntervalEntity) => {
    if (['totalDebts', 'netDebts'].includes(balanceTypeOp)) {
      return -1 * obj[balanceTypeOp];
    }
    return obj[balanceTypeOp];
  };

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [activeRing, setActiveRing] = useState<'group' | 'category'>(
    'category',
  );

  const isCategoryGroup =
    groupBy === 'CategoryGroup' && !!data.groupedData?.length;

  const { adjustedGroupData, flatCategories } = useMemo(() => {
    if (!isCategoryGroup || !data.groupedData) {
      return { adjustedGroupData: [], flatCategories: [] };
    }

    const adjustedGroups = data.groupedData
      .map(group => {
        const visibleCats = group.categories ?? [];
        return {
          ...group,
          totalAssets: visibleCats.reduce((sum, c) => sum + c.totalAssets, 0),
          totalDebts: visibleCats.reduce((sum, c) => sum + c.totalDebts, 0),
          totalTotals: visibleCats.reduce((sum, c) => sum + c.totalTotals, 0),
          netAssets: visibleCats.reduce((sum, c) => sum + c.netAssets, 0),
          netDebts: visibleCats.reduce((sum, c) => sum + c.netDebts, 0),
        };
      })
      .filter(group =>
        ['totalDebts', 'netDebts'].includes(balanceTypeOp)
          ? -1 * group[balanceTypeOp] !== 0
          : group[balanceTypeOp] !== 0,
      );

    return {
      adjustedGroupData: adjustedGroups,
      flatCategories: data.groupedData.flatMap(g => g.categories ?? []),
    };
  }, [isCategoryGroup, data.groupedData, balanceTypeOp]);

  const colorMap = useMemo(
    () =>
      isCategoryGroup
        ? buildColorMap(data.groupedData ?? [], data.legend ?? [])
        : new Map<string, string>(),
    [isCategoryGroup, data.groupedData, data.legend],
  );

  return (
    <Container style={style}>
      {(width, height) => {
        const { chartInnerRadius, chartMidRadius, chartOuterRadius, compact } =
          getDonutDimensions(width, height, isCategoryGroup);

        const showActiveShape = width >= 220 && height >= 130;

        // ---------------------------------------------------------------
        // Two-ring concentric donut (CategoryGroup mode)
        // ---------------------------------------------------------------
        if (isCategoryGroup) {
          return (
            data.groupedData && (
              <div>
                {!compact && <div style={{ marginTop: '15px' }} />}
                <PieChart
                  responsive
                  width={width}
                  height={height}
                  style={{ cursor: pointer }}
                >
                  {/* Inner ring — Category Groups */}
                  <Pie
                    dataKey={val => getVal(val)}
                    nameKey="name"
                    {...animationProps}
                    data={adjustedGroupData}
                    innerRadius={chartInnerRadius}
                    outerRadius={chartMidRadius}
                    startAngle={90}
                    endAngle={-270}
                    shape={(props: PieSectorShapeProps, index: number) => {
                      const item = adjustedGroupData[index];
                      const fill =
                        colorMap.get(item?.id ?? item?.name ?? '') ??
                        props.fill;
                      const isActive =
                        activeRing === 'group' && index === activeGroupIndex;
                      if (isActive && showActiveShape) {
                        return compact ? (
                          <ActiveShapeMobile
                            {...(props as unknown as ActiveShapeProps)}
                            fill={fill}
                            expandInward
                            chartInnerRadius={chartInnerRadius}
                            chartMidRadius={chartMidRadius}
                            chartOuterRadius={chartOuterRadius}
                          />
                        ) : (
                          <ActiveShapeDesktop
                            {...(props as unknown as ActiveShapeProps)}
                            fill={fill}
                            expandInward
                            chartInnerRadius={chartInnerRadius}
                            chartMidRadius={chartMidRadius}
                            chartOuterRadius={chartOuterRadius}
                          />
                        );
                      }
                      return <Sector {...props} fill={fill} />;
                    }}
                    onMouseLeave={() => setPointer('')}
                    onMouseEnter={(_, index) => {
                      if (canDeviceHover()) {
                        setActiveGroupIndex(index);
                        setActiveRing('group');
                      }
                    }}
                    onClick={(item, index) => {
                      if (!canDeviceHover()) {
                        setActiveGroupIndex(index);
                        setActiveRing('group');
                      }
                      if (
                        (canDeviceHover() || activeGroupIndex === index) &&
                        ((compact && showTooltip) || !compact)
                      ) {
                        const groupCategoryIds = (
                          data.groupedData?.find(g => g.id === item.id)
                            ?.categories ?? []
                        )
                          .map(c => c.id)
                          .filter((c): c is string => c != null);

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
                          field: 'category',
                          id: groupCategoryIds,
                        });
                      }
                    }}
                  />

                  {/* Outer ring — Categories */}
                  <Pie
                    dataKey={val => getVal(val)}
                    nameKey="name"
                    {...animationProps}
                    data={flatCategories}
                    innerRadius={chartMidRadius}
                    outerRadius={chartOuterRadius}
                    startAngle={90}
                    endAngle={-270}
                    labelLine={false}
                    label={e =>
                      viewLabels && !compact ? customLabel(e) : null
                    }
                    shape={(props: PieSectorShapeProps, index: number) => {
                      const item = flatCategories[index];
                      const fill =
                        colorMap.get(item?.id ?? item?.name ?? '') ??
                        props.fill;
                      const isActive =
                        activeRing === 'category' &&
                        index === activeCategoryIndex;
                      if (isActive && showActiveShape) {
                        return compact ? (
                          <ActiveShapeMobile
                            {...(props as unknown as ActiveShapeProps)}
                            fill={fill}
                            expandInward={false}
                            chartInnerRadius={chartInnerRadius}
                            chartMidRadius={chartMidRadius}
                            chartOuterRadius={chartOuterRadius}
                          />
                        ) : (
                          <ActiveShapeDesktop
                            {...(props as unknown as ActiveShapeProps)}
                            fill={fill}
                            expandInward={false}
                            chartInnerRadius={chartInnerRadius}
                            chartMidRadius={chartMidRadius}
                            chartOuterRadius={chartOuterRadius}
                          />
                        );
                      }
                      return <Sector {...props} fill={fill} />;
                    }}
                    onMouseLeave={() => setPointer('')}
                    onMouseEnter={(_, index) => {
                      if (canDeviceHover()) {
                        setActiveCategoryIndex(index);
                        setActiveRing('category');
                        setPointer('pointer');
                      }
                    }}
                    onClick={(item, index) => {
                      if (!canDeviceHover()) {
                        setActiveCategoryIndex(index);
                        setActiveRing('category');
                      }
                      if (
                        (canDeviceHover() || activeCategoryIndex === index) &&
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
                          field: 'category',
                          id: item.id,
                        });
                      }
                    }}
                  />
                </PieChart>
              </div>
            )
          );
        }

        // ---------------------------------------------------------------
        // Single-ring donut (all other groupBy modes)
        // ---------------------------------------------------------------
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
                  dataKey={val => getVal(val)}
                  nameKey={yAxis}
                  {...animationProps}
                  data={data[splitData]?.map(item => ({ ...item })) ?? []}
                  innerRadius={chartInnerRadius}
                  labelLine={false}
                  label={e =>
                    viewLabels && !compact ? customLabel(e) : <div />
                  }
                  startAngle={90}
                  endAngle={-270}
                  shape={(props: PieSectorShapeProps, index: number) => {
                    // Fix 3: optional chain data.legend to guard against undefined
                    const fill = data.legend?.[index]?.color ?? props.fill;
                    const isActive = index === activeIndex;
                    if (isActive && showActiveShape) {
                      return compact ? (
                        <ActiveShapeMobile
                          {...(props as unknown as ActiveShapeProps)}
                          fill={fill}
                          expandInward
                          chartInnerRadius={chartInnerRadius}
                          chartMidRadius={chartMidRadius}
                          chartOuterRadius={chartOuterRadius}
                        />
                      ) : (
                        <ActiveShapeDesktop
                          {...(props as unknown as ActiveShapeProps)}
                          fill={fill}
                          expandInward={false}
                          chartInnerRadius={chartInnerRadius}
                          chartMidRadius={chartMidRadius}
                          chartOuterRadius={chartOuterRadius}
                        />
                      );
                    }
                    return <Sector {...props} fill={fill} />;
                  }}
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
                      !['Interval'].includes(groupBy) &&
                      (canDeviceHover() || activeIndex === index) &&
                      ((compact && showTooltip) || !compact)
                    ) {
                      const groupCategoryIds =
                        groupBy === 'Group'
                          ? (
                              categories.grouped.find(g => g.id === item.id)
                                ?.categories ?? []
                            )
                              .map(c => c.id)
                              .filter((c): c is string => c != null)
                          : undefined;

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
                        field:
                          groupBy === 'Group'
                            ? 'category'
                            : groupBy.toLowerCase(),
                        id: groupBy === 'Group' ? groupCategoryIds : item.id,
                      });
                    }
                  }}
                />
              </PieChart>
            </div>
          )
        );
      }}
    </Container>
  );
}
