// @ts-strict-ignore
import React, { useMemo, useRef } from 'react';
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
import { css } from '@emotion/css';
import { Pie, PieChart, Tooltip } from 'recharts';
import type { PieSectorDataItem, PieSectorShapeProps } from 'recharts';

import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useNavigate } from '#hooks/useNavigate';
import { isTouchDevice } from '#util/isTouchDevice';

import { adjustTextSize } from './adjustTextSize';
import { DonutActiveShapeDesktop } from './DonutActiveShapeDesktop';
import { DonutActiveShapeMobile } from './DonutActiveShapeMobile';
import type { DonutActiveShapeProps } from './donutActiveShapeProps';
import { DonutSector } from './DonutSector';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

const RADIAN = Math.PI / 180;

const sectorCursor = css({ '& .recharts-pie-sector': { cursor: 'pointer' } });

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

  const getVal = (obj: GroupedEntity | IntervalEntity) => {
    if (['totalDebts', 'netDebts'].includes(balanceTypeOp)) {
      return -1 * obj[balanceTypeOp];
    }
    return obj[balanceTypeOp];
  };

  // The hovered slice is kept in Recharts' own state, read through each
  // sector's isActive. Keeping it in this component's state would re-render
  // the Pie, which remounts every sector and loses slow pointer moves.
  // Touch devices select a slice with a first tap and open it with a second,
  // remembered here without re-rendering.
  const lastTapRef = useRef<string | null>(null);
  const isOpeningTap = (key: string) => {
    if (!isTouchDevice() || lastTapRef.current === key) {
      return true;
    }
    lastTapRef.current = key;
    return false;
  };

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
                  className={sectorCursor}
                >
                  {/* Drives each sector's isActive; the label is the tooltip */}
                  <Tooltip content={() => null} active />
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
                      const highlight =
                        props.isActive && showActiveShape ? (
                          compact ? (
                            <DonutActiveShapeMobile
                              {...(props as unknown as DonutActiveShapeProps)}
                              fill={fill}
                              expandInward
                              chartInnerRadius={chartInnerRadius}
                              chartMidRadius={chartMidRadius}
                              chartOuterRadius={chartOuterRadius}
                            />
                          ) : (
                            <DonutActiveShapeDesktop
                              {...(props as unknown as DonutActiveShapeProps)}
                              fill={fill}
                              expandInward
                              chartInnerRadius={chartInnerRadius}
                              chartMidRadius={chartMidRadius}
                              chartOuterRadius={chartOuterRadius}
                            />
                          )
                        ) : null;
                      return (
                        <DonutSector
                          sector={props}
                          fill={fill}
                          highlight={highlight}
                        />
                      );
                    }}
                    onClick={(item: ClickablePieItem, index) => {
                      if (
                        isOpeningTap(`group-${index}`) &&
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
                      const highlight =
                        props.isActive && showActiveShape ? (
                          compact ? (
                            <DonutActiveShapeMobile
                              {...(props as unknown as DonutActiveShapeProps)}
                              fill={fill}
                              expandInward={false}
                              chartInnerRadius={chartInnerRadius}
                              chartMidRadius={chartMidRadius}
                              chartOuterRadius={chartOuterRadius}
                            />
                          ) : (
                            <DonutActiveShapeDesktop
                              {...(props as unknown as DonutActiveShapeProps)}
                              fill={fill}
                              expandInward={false}
                              chartInnerRadius={chartInnerRadius}
                              chartMidRadius={chartMidRadius}
                              chartOuterRadius={chartOuterRadius}
                            />
                          )
                        ) : null;
                      return (
                        <DonutSector
                          sector={props}
                          fill={fill}
                          highlight={highlight}
                        />
                      );
                    }}
                    onClick={(item: ClickablePieItem, index) => {
                      if (
                        isOpeningTap(`category-${index}`) &&
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
                className={sectorCursor}
              >
                {/* Drives each sector's isActive; the label is the tooltip */}
                <Tooltip content={() => null} active defaultIndex={0} />
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
                    const highlight =
                      props.isActive && showActiveShape ? (
                        compact ? (
                          <DonutActiveShapeMobile
                            {...(props as unknown as DonutActiveShapeProps)}
                            fill={fill}
                            expandInward
                            chartInnerRadius={chartInnerRadius}
                            chartMidRadius={chartMidRadius}
                            chartOuterRadius={chartOuterRadius}
                          />
                        ) : (
                          <DonutActiveShapeDesktop
                            {...(props as unknown as DonutActiveShapeProps)}
                            fill={fill}
                            expandInward={false}
                            chartInnerRadius={chartInnerRadius}
                            chartMidRadius={chartMidRadius}
                            chartOuterRadius={chartOuterRadius}
                          />
                        )
                      ) : null;
                    return (
                      <DonutSector
                        sector={props}
                        fill={fill}
                        highlight={highlight}
                      />
                    );
                  }}
                  onClick={(item: ClickablePieItem, index) => {
                    if (
                      isOpeningTap(`slice-${index}`) &&
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
