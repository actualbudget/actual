// @ts-strict-ignore
import React, { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import { Pie, PieChart, Sector } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';

import type {
  balanceTypeOpType,
  DataEntity,
  GroupedEntity,
  IntervalEntity,
  LegendEntity,
  RuleConditionEntity,
} from 'loot-core/types/models';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

const RADIAN = Math.PI / 180;

const canDeviceHover = () => window.matchMedia('(hover: hover)').matches;

// ---------------------------------------------------------------------------
// Color helpers for two-ring donut
// ---------------------------------------------------------------------------

/**
 * Resolve a CSS variable like `var(--color-chartQual1)` to its actual hex
 * value from the document computed styles. If already a plain color, returns
 * as-is. Handles CSS fallback syntax e.g. `var(--color, #fallback)` by
 * stripping the fallback before lookup.
 */
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

/**
 * Lighten a color by mixing it toward white.
 * Resolves CSS variables before parsing so `var(--color-*)` works correctly.
 * percent=0 → original color, percent=1 → white
 */
const shadeColor = (color: string, percent: number): string => {
  const resolved = resolveCSSVariable(color);
  const { r, g, b } = hexToRgb(resolved);
  const adjust = (c: number) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * percent)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
};

/**
 * Build two color maps from groupedData using the legend keyed by group id.
 * Since CategoryGroup mode uses groupByLabel='categoryGroup', the legend
 * has one entry per group with the correct color.
 *
 *  - groupColorMap:    groupId → color from legend
 *  - categoryColorMap: catId   → shaded variant of parent group color
 */
const buildColorMaps = (
  groupedData: GroupedEntity[],
  legend: LegendEntity[],
) => {
  const groupColorMap = new Map<string, string>();
  const categoryColorMap = new Map<string, string>();

  const legendById = new Map(
    legend
      .filter(l => l.id !== null && l.id !== undefined)
      .map(l => [l.id, l.color]),
  );

  groupedData.forEach(group => {
    if (!group.id) return;

    const groupColor = legendById.get(group.id);
    if (!groupColor) return;

    const resolvedGroupColor = resolveCSSVariable(groupColor);
    groupColorMap.set(group.id, resolvedGroupColor);

    const cats = group.categories ?? [];
    cats.forEach((cat, catIndex) => {
      if (!cat.id) return;
      const shade = 0.15 + (catIndex / Math.max(cats.length, 1)) * 0.5;
      categoryColorMap.set(cat.id, shadeColor(resolvedGroupColor, shade));
    });
  });

  return { groupColorMap, categoryColorMap };
};

// ---------------------------------------------------------------------------
// Active shape components
// ---------------------------------------------------------------------------

/**
 * Mobile active shape — used by both single-ring and two-ring modes.
 * expandInward=true  → expansion arc drawn inside the inner radius (inner ring)
 * expandInward=false → expansion arc drawn outside the outer radius (outer/single ring)
 */
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
    expandInward = false,
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
        <FinancialText
          as="text"
          x={cx + outerRadius * Math.cos(-RADIAN * 240) - 30}
          y={ey}
          dy={0}
          textAnchor="end"
          fill={fill}
        >
          {`${format(value, 'financial')}`}
        </FinancialText>
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
      {/* Expansion arc — inward for inner ring, outward for outer/single ring */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={expandInward ? innerRadius - 8 : outerRadius + 2}
        outerRadius={expandInward ? innerRadius - 6 : outerRadius + 4}
        fill={fill}
      />
    </g>
  );
};

const ActiveShapeMobileWithFormat = props => (
  <ActiveShapeMobile {...props} format={props.format} />
);

/**
 * Original desktop active shape — used for single-ring donut only.
 * Includes line and dot extending out from the slice.
 */
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
        <FinancialText
          as="text"
          x={ex + (cos <= 0 ? 1 : -1) * 16}
          y={ey}
          dy={18}
          textAnchor={textAnchor}
          fill={fill}
        >
          {`${format(value, 'financial')}`}
        </FinancialText>
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

/**
 * Two-ring desktop active shape.
 * No line or dot — label is centered in the white hole of the inner ring.
 * expandInward=true  → expansion arc inward (inner ring)
 * expandInward=false → expansion arc outward (outer ring)
 */
const ActiveShapeTwoRing = props => {
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
    expandInward = false,
  } = props;
  const yAxis = payload.name ?? payload.date;

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
      {/* Expansion arc — inward for inner ring, outward for outer ring */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={expandInward ? innerRadius - 10 : outerRadius + 6}
        outerRadius={expandInward ? innerRadius - 6 : outerRadius + 10}
        fill={fill}
      />
      {/* Label centered in the white hole of the inner ring */}
      <text x={cx} y={cy - 18} textAnchor="middle" fill={fill} fontSize={12}>
        {yAxis}
      </text>
      <PrivacyFilter>
        <FinancialText
          as="text"
          x={cx}
          y={cy}
          textAnchor="middle"
          fill={fill}
          fontSize={11}
        >
          {`${format(value, 'financial')}`}
        </FinancialText>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#999" fontSize={10}>
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
      </PrivacyFilter>
    </g>
  );
};

const ActiveShapeTwoRingWithFormat = props => (
  <ActiveShapeTwoRing {...props} format={props.format} />
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
  const format = useFormat();
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
    } else {
      return obj[balanceTypeOp];
    }
  };

  // Single-ring active index (all groupBy modes except CategoryGroup)
  const [activeIndex, setActiveIndex] = useState(0);

  // Two-ring state (CategoryGroup mode only)
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  // Tracks which ring is currently hovered so only one shows active shape at a time
  const [activeRing, setActiveRing] = useState<'group' | 'category'>(
    'category',
  );

  const isCategoryGroup =
    groupBy === 'CategoryGroup' && !!data.groupedData?.length;

  /**
   * Recompute group totals as the sum of their visible (non-filtered) categories.
   * Also filter out zero-total groups to avoid invisible sectors shifting hover indices.
   */
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

  const { groupColorMap, categoryColorMap } = useMemo(
    () =>
      isCategoryGroup
        ? buildColorMaps(data.groupedData ?? [], data.legend ?? [])
        : {
            groupColorMap: new Map<string, string>(),
            categoryColorMap: new Map<string, string>(),
          },
    [isCategoryGroup, data.groupedData, data.legend],
  );

  return (
    <Container style={style}>
      {(width, height) => {
        const compact = height <= 300 || width <= 300;
        const minDim = Math.min(width, height);

        // Shared ring boundary — both rings meet here with no gap
        const ringBoundary = minDim * 0.31;

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
                  {/* Inner ring — Category Groups, expansion arc goes inward */}
                  {/* Uses adjustedGroupData so group totals match sum of visible categories */}
                  <Pie
                    dataKey={val => getVal(val)}
                    nameKey="name"
                    {...animationProps}
                    data={adjustedGroupData}
                    innerRadius={minDim * 0.2}
                    outerRadius={ringBoundary}
                    startAngle={90}
                    endAngle={-270}
                    shape={(props: PieSectorShapeProps, index: number) => {
                      const item = adjustedGroupData[index];
                      const fill = item?.id
                        ? groupColorMap.get(item.id)
                        : groupColorMap.get(item?.name ?? '');
                      if (!fill) return <Sector {...props} />;
                      const showActiveShape = width >= 220 && height >= 130;
                      const isActive =
                        activeRing === 'group' &&
                        (props.isActive || index === activeGroupIndex);
                      if (isActive && showActiveShape) {
                        const shapeProps = {
                          ...props,
                          fill,
                          format,
                          expandInward: true,
                        };
                        return compact ? (
                          <ActiveShapeMobileWithFormat {...shapeProps} />
                        ) : (
                          <ActiveShapeTwoRingWithFormat {...shapeProps} />
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
                    onClick={(_, index) => {
                      if (!canDeviceHover()) {
                        setActiveGroupIndex(index);
                        setActiveRing('group');
                      }
                    }}
                  />

                  {/* Outer ring — Categories, expansion arc goes outward */}
                  <Pie
                    dataKey={val => getVal(val)}
                    nameKey="name"
                    {...animationProps}
                    data={flatCategories}
                    innerRadius={ringBoundary}
                    outerRadius={minDim * 0.42}
                    startAngle={90}
                    endAngle={-270}
                    labelLine={false}
                    label={e =>
                      viewLabels && !compact ? customLabel(e) : <div />
                    }
                    shape={(props: PieSectorShapeProps, index: number) => {
                      const item = flatCategories[index];
                      const fill = item?.id
                        ? categoryColorMap.get(item.id)
                        : categoryColorMap.get(item?.name ?? '');
                      if (!fill) return <Sector {...props} />;
                      const showActiveShape = width >= 220 && height >= 130;
                      const isActive =
                        activeRing === 'category' &&
                        (props.isActive || index === activeCategoryIndex);
                      if (isActive && showActiveShape) {
                        const shapeProps = {
                          ...props,
                          fill,
                          format,
                          expandInward: false,
                        };
                        return compact ? (
                          <ActiveShapeMobileWithFormat {...shapeProps} />
                        ) : (
                          <ActiveShapeTwoRingWithFormat {...shapeProps} />
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
        // Original single-ring donut (all other groupBy modes)
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
                  data={
                    data[splitData]?.map(item => ({
                      ...item,
                    })) ?? []
                  }
                  innerRadius={minDim * 0.2}
                  fill="#8884d8"
                  labelLine={false}
                  label={e =>
                    viewLabels && !compact ? customLabel(e) : <div />
                  }
                  startAngle={90}
                  endAngle={-270}
                  shape={(props: PieSectorShapeProps, index: number) => {
                    const fill = data.legend[index]?.color ?? props.fill;
                    const showActiveShape = width >= 220 && height >= 130;
                    const isActive = props.isActive || index === activeIndex;
                    if (isActive && showActiveShape) {
                      const shapeProps = { ...props, fill, format };
                      return compact ? (
                        <ActiveShapeMobileWithFormat {...shapeProps} />
                      ) : (
                        <ActiveShapeWithFormat {...shapeProps} />
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
                />
              </PieChart>
            </div>
          )
        );
      }}
    </Container>
  );
}
