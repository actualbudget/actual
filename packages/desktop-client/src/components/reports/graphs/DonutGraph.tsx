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
import type { PieSectorDataItem, PieSectorShapeProps } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { isTouchDevice } from '#util/isTouchDevice';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

const RADIAN = Math.PI / 180;

type ClickablePieItem = PieSectorDataItem &
  Partial<Pick<GroupedEntity, 'id' | 'uncategorizedId' | 'bucketTagNames'>> &
  Partial<Pick<IntervalEntity, 'intervalStartDate' | 'intervalEndDate'>>;

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
  if (!color || typeof color !== 'string' || !color.startsWith('var(')) {
    return color || '';
  }
  const inner = color.slice(4, -1).trim();
  const varName = inner.split(',')[0].trim();
  if (typeof document === 'undefined') return color;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim() || color
  );
};

export const hslToRgb = (
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } => {
  const normalizedH = ((h % 360) + 360) % 360;
  const normalizedS = Math.max(0, Math.min(1, s));
  const normalizedL = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const x = c * (1 - Math.abs(((normalizedH / 60) % 2) - 1));
  const m = normalizedL - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (normalizedH >= 0 && normalizedH < 60) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (normalizedH >= 60 && normalizedH < 120) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (normalizedH >= 120 && normalizedH < 180) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (normalizedH >= 180 && normalizedH < 240) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (normalizedH >= 240 && normalizedH < 300) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
};

export type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

const parseAlpha = (val: string | undefined): number | undefined => {
  if (val == null) return undefined;
  const trimmed = val.trim();
  if (trimmed === '') return undefined;
  const num = parseFloat(trimmed);
  if (isNaN(num)) return undefined;
  if (trimmed.endsWith('%')) {
    return Math.min(1, Math.max(0, num / 100));
  }
  return Math.min(1, Math.max(0, num));
};

export const parseColor = (color: string): ParsedColor | null => {
  if (!color || typeof color !== 'string') return null;
  const trimmed = color.trim();

  // 1. HSL / HSLA (e.g. "hsl(210, 50%, 50%)", "hsl(210 50 50)", "hsla(210, 50%, 50%, 0.5)", "hsl(210 50 50 / 0.5)", "hsl(0 100% 50% / 0)")
  const hslMatch =
    /^hsla?\(\s*(-?[\d.]+)(deg|turn|rad|grad)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?(?:[\s,/]+([\d.]+%?))?\s*\)/i.exec(
      trimmed,
    );
  if (hslMatch) {
    let h = parseFloat(hslMatch[1]);
    const unit = hslMatch[2]?.toLowerCase();
    if (unit === 'turn') h *= 360;
    else if (unit === 'rad') h *= 180 / Math.PI;
    else if (unit === 'grad') h *= 0.9;
    const s = parseFloat(hslMatch[3]) / 100;
    const l = parseFloat(hslMatch[4]) / 100;
    const rgb = hslToRgb(h, s, l);
    const a = parseAlpha(hslMatch[5]);
    return a !== undefined ? { ...rgb, a } : rgb;
  }

  // 2. RGB / RGBA (e.g. "rgb(255, 0, 0)", "rgba(255, 0, 0, 0.5)", "rgb(100%, 0%, 0%)", "rgb(255 0 0 / 0.5)")
  const rgbMatch =
    /^rgba?\(\s*([\d.]+)(%?)[\s,]+([\d.]+)(%?)[\s,]+([\d.]+)(%?)(?:[\s,/]+([\d.]+%?))?\s*\)/i.exec(
      trimmed,
    );
  if (rgbMatch) {
    const parseChannel = (val: string, isPercent: string) => {
      const num = parseFloat(val);
      if (isPercent === '%') {
        return Math.min(255, Math.max(0, Math.round((num / 100) * 255)));
      }
      return Math.min(255, Math.max(0, Math.round(num)));
    };
    const r = parseChannel(rgbMatch[1], rgbMatch[2]);
    const g = parseChannel(rgbMatch[3], rgbMatch[4]);
    const b = parseChannel(rgbMatch[5], rgbMatch[6]);
    const a = parseAlpha(rgbMatch[7]);
    return a !== undefined ? { r, g, b, a } : { r, g, b };
  }

  // 3. 3-digit or 4-digit hex: #rgb or #rgba
  const hex3 = /^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i.exec(trimmed);
  if (hex3) {
    const r = parseInt(hex3[1] + hex3[1], 16);
    const g = parseInt(hex3[2] + hex3[2], 16);
    const b = parseInt(hex3[3] + hex3[3], 16);
    if (hex3[4]) {
      const a = parseInt(hex3[4] + hex3[4], 16) / 255;
      return { r, g, b, a };
    }
    return { r, g, b };
  }

  // 4. 6-digit or 8-digit hex: #rrggbb or #rrggbbaa
  const hex6 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(
    trimmed,
  );
  if (hex6) {
    const r = parseInt(hex6[1], 16);
    const g = parseInt(hex6[2], 16);
    const b = parseInt(hex6[3], 16);
    if (hex6[4]) {
      const a = parseInt(hex6[4], 16) / 255;
      return { r, g, b, a };
    }
    return { r, g, b };
  }

  return null;
};

export const colorToRgb = (
  color: string,
): { r: number; g: number; b: number } => {
  const parsed = parseColor(color);
  return parsed
    ? { r: parsed.r, g: parsed.g, b: parsed.b }
    : { r: 0, g: 0, b: 0 };
};

export const hexToRgb = colorToRgb;

export const shadeColor = (color: string, percent: number): string => {
  const parsed = parseColor(color);
  if (!parsed) return color;
  const { r, g, b, a } = parsed;
  const adjust = (c: number) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * percent)));
  if (a !== undefined && a < 1) {
    const roundedAlpha = Math.round(a * 1000) / 1000;
    return `rgba(${adjust(r)}, ${adjust(g)}, ${adjust(b)}, ${roundedAlpha})`;
  }
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
};

export const buildColorMap = (
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
  const animationProps = useRechartsAnimation({ animationDuration: 500 });

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
                    animationBegin={100}
                    data={adjustedGroupData}
                    innerRadius={chartInnerRadius}
                    outerRadius={chartMidRadius}
                    startAngle={90}
                    endAngle={-270}
                    shape={(props: PieSectorShapeProps) => {
                      const { index } = props;
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
                      if (!isTouchDevice()) {
                        setActiveGroupIndex(index);
                        setActiveRing('group');
                      }
                    }}
                    onClick={(item: ClickablePieItem, index) => {
                      if (isTouchDevice()) {
                        setActiveGroupIndex(index);
                        setActiveRing('group');
                      }
                      if (
                        (!isTouchDevice() || activeGroupIndex === index) &&
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
                          field: 'group',
                          id: item.id,
                          uncategorizedId: item.uncategorizedId,
                        });
                      }
                    }}
                  />

                  {/* Outer ring — Categories */}
                  <Pie
                    dataKey={val => getVal(val)}
                    nameKey="name"
                    {...animationProps}
                    animationBegin={100}
                    data={flatCategories}
                    innerRadius={chartMidRadius}
                    outerRadius={chartOuterRadius}
                    startAngle={90}
                    endAngle={-270}
                    labelLine={false}
                    label={e =>
                      viewLabels && !compact ? customLabel(e) : null
                    }
                    shape={(props: PieSectorShapeProps) => {
                      const { index } = props;
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
                      if (!isTouchDevice()) {
                        setActiveCategoryIndex(index);
                        setActiveRing('category');
                        setPointer('pointer');
                      }
                    }}
                    onClick={(item: ClickablePieItem, index) => {
                      if (isTouchDevice()) {
                        setActiveCategoryIndex(index);
                        setActiveRing('category');
                      }
                      if (
                        (!isTouchDevice() || activeCategoryIndex === index) &&
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
                          uncategorizedId: item.uncategorizedId,
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
                  animationBegin={100}
                  data={data[splitData]?.map(item => ({ ...item })) ?? []}
                  innerRadius={chartInnerRadius}
                  labelLine={false}
                  label={e =>
                    viewLabels && !compact ? customLabel(e) : <div />
                  }
                  startAngle={90}
                  endAngle={-270}
                  shape={(props: PieSectorShapeProps) => {
                    const { index } = props;
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
                    if (!isTouchDevice()) {
                      setActiveIndex(index);
                      setPointer('pointer');
                    }
                  }}
                  onClick={(item: ClickablePieItem, index) => {
                    if (isTouchDevice()) {
                      setActiveIndex(index);
                    }
                    if (
                      (!isTouchDevice() || activeIndex === index) &&
                      ((compact && showTooltip) || !compact)
                    ) {
                      // Interval slices drill down by their own date range instead of a field
                      const drilldown =
                        groupBy === 'Interval'
                          ? {
                              startDate:
                                item.intervalStartDate ?? data.startDate,
                              endDate: item.intervalEndDate ?? data.endDate,
                            }
                          : {
                              startDate: data.startDate,
                              endDate: data.endDate,
                              field: groupBy.toLowerCase(),
                              id: item.id,
                              uncategorizedId: item.uncategorizedId,
                            };

                      showActivity({
                        navigate,
                        categories,
                        accounts,
                        balanceTypeOp,
                        filters,
                        showHiddenCategories,
                        showOffBudget,
                        type: 'totals',
                        ...drilldown,
                        bucketTagNames: item.bucketTagNames,
                        scopeTagNames: data.scopeTagNames,
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
