import React, { useRef } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  DataEntity,
  GroupedEntity,
  IntervalEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';
import { Pie, PieChart, Tooltip } from 'recharts';
import type { PieLabelRenderProps, PieSectorShapeProps } from 'recharts';

import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { isTouchDevice } from '#util/isTouchDevice';

import { adjustTextSize } from './adjustTextSize';
import { DonutActiveShapeDesktop } from './DonutActiveShapeDesktop';
import { DonutActiveShapeMobile } from './DonutActiveShapeMobile';
import type { DonutActiveShapeProps } from './donutActiveShapeProps';
import { buildColorMap } from './donutColors';
import { DonutSector } from './DonutSector';
import { formatChange } from './formatChange';
import { getChangeColor } from './getChangeColor';
import { getSpendingSign } from './getSpendingSign';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

const RADIAN = Math.PI / 180;

// How solid baselines, and their highlights, are drawn
const GHOST_OPACITY = 0.3;

const sectorCursor = css({ '& .recharts-pie-sector': { cursor: 'pointer' } });

// What a slice opens when it's clicked
type Drilldown = {
  startDate: string;
  endDate?: string;
  field?: string;
  id?: string;
  uncategorizedId?: GroupedEntity['uncategorizedId'];
  bucketTagNames?: string[];
};

// One slice of the chart, sized by the larger of its amount and baseline
type Slot = {
  name: string;
  color: string;
  amount: number;
  baseline: number;
  size: number;
  change: number;
  drilldown: Drilldown;
};

// One level of the split, like groups or categories, drawn as a faint ring
// of baselines inside a ring of amounts
type Level = {
  key: string;
  slots: Slot[];
  totalAmount: number;
  totalBaseline: number;
};

// A ring is drawn as each slot's value then a gap filling the rest of the
// slot, so all the rings' slots line up
type Segment = {
  slotIndex: number;
  value: number;
  isGap: boolean;
};

type Ring = {
  key: string;
  level: Level;
  segments: Segment[];
  isBaseline: boolean;
  innerRadius: number;
  outerRadius: number;
  // Whether the hovered segment is highlighted in the hole rather than
  // outside the chart
  expandInward: boolean;
};

type BaselineDonutGraphProps = {
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

/**
 * A donut comparing amounts with a baseline: each amount ring has a faint
 * ring of its baselines inside it, both starting from the same angle in a
 * slice sized by whichever is larger. Split by category and group, the group
 * rings sit inside the category rings, each group spanning its categories.
 */
export function BaselineDonutGraph({
  style,
  data,
  filters,
  groupBy,
  balanceTypeOp,
  viewLabels,
  showHiddenCategories = false,
  showOffBudget = false,
  showTooltip = true,
}: BaselineDonutGraphProps) {
  const animationProps = useRechartsAnimation({ animationDuration: 500 });
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const { data: categories = { grouped: [], list: [] } } = useCategories();
  const { data: accounts = [] } = useAccounts();
  // The hovered segment is kept in Recharts' own state, read through each
  // sector's isActive, so hovering doesn't re-render the Pies. Touch devices
  // select a slice with a first tap and open it with a second.
  const lastTapRef = useRef<string | null>(null);

  const dates = { startDate: data.startDate ?? '', endDate: data.endDate };
  const groupedData = data.groupedData ?? [];
  const levels =
    groupBy === 'CategoryGroup' && groupedData.length
      ? getCategoryGroupLevels(groupedData, {
          colorMap: buildColorMap(groupedData, data.legend ?? []),
          balanceTypeOp,
          dates,
        })
      : [
          getLevel(
            'slots',
            getSlots(
              (groupBy === 'Interval' ? data.intervalData : data.data) ?? [],
              {
                colors: (data.legend ?? []).map(entry => entry.color),
                balanceTypeOp,
                field: groupBy.toLowerCase(),
                dates,
              },
            ),
          ),
        ];

  const onSelect = (tapKey: string, slot: Slot, compact: boolean) => {
    if (isTouchDevice() && lastTapRef.current !== tapKey) {
      lastTapRef.current = tapKey;
      return;
    }
    if (compact && !showTooltip) {
      return;
    }

    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp,
      filters,
      showHiddenCategories,
      showOffBudget,
      type: 'totals',
      ...slot.drilldown,
      scopeTagNames: data.scopeTagNames,
    });
  };

  return (
    <Container style={style}>
      {(width, height) => {
        const minDim = Math.min(width, height);
        const compact = height <= 300 || width <= 300;
        const innerRadius = minDim * (compact ? 0.16 : 0.2);
        const outerRadius = minDim * (compact ? 0.36 : 0.42);
        const rings = getRings(levels, innerRadius, outerRadius);
        const labelledRing = rings.at(-1);

        const showActiveShape = showTooltip && width >= 220 && height >= 130;

        // A hovered segment is drawn like other donuts' active sectors,
        // labelled with its own ring's values. Gaps highlight the slot's
        // empty part and stay transparent, and baselines stay faint.
        const renderSegment =
          ({ level, segments, isBaseline, expandInward }: Ring) =>
          (props: PieSectorShapeProps) => {
            const segment = segments[props.index];
            if (!segment) {
              return null;
            }

            const slot = level.slots[segment.slotIndex];
            const value = isBaseline ? slot.baseline : slot.amount;
            const total = isBaseline ? level.totalBaseline : level.totalAmount;
            const ActiveShape = compact
              ? DonutActiveShapeMobile
              : DonutActiveShapeDesktop;
            const highlight =
              props.isActive && showActiveShape ? (
                <ActiveShape
                  // Recharts' sector props carry everything else it needs
                  {...(props as unknown as DonutActiveShapeProps)}
                  {...getHighlightAngles(props, segment, value)}
                  // Highlights outside the chart go past its outer edge, not
                  // just past this ring's
                  outerRadius={outerRadius}
                  fill={slot.color}
                  highlightOpacity={isBaseline ? GHOST_OPACITY : undefined}
                  payload={{ name: slot.name }}
                  value={value}
                  // A baseline says what it is, and an amount shows its
                  // change from the baseline
                  valueText={
                    isBaseline
                      ? t('Baseline: {{amount}}', {
                          amount: format(value, 'financial'),
                        })
                      : undefined
                  }
                  change={
                    isBaseline
                      ? undefined
                      : {
                          text: formatChange(
                            slot.change,
                            format,
                            balanceTypeOp,
                          ),
                          color: getChangeColor(slot.change),
                        }
                  }
                  percent={total ? value / total : 0}
                  expandInward={expandInward}
                  chartInnerRadius={innerRadius}
                  chartOuterRadius={outerRadius}
                />
              ) : null;

            // Gaps are transparent but still catch the pointer, so thin
            // slices can be picked by their whole slot
            return (
              <DonutSector
                sector={props}
                fill={segment.isGap ? 'transparent' : slot.color}
                fillOpacity={getSegmentOpacity(segment, isBaseline)}
                stroke={segment.isGap ? 'none' : undefined}
                highlight={highlight}
              />
            );
          };

        // Percentages go on the outermost ring
        const renderLabel = (props: PieLabelRenderProps) => {
          const segment = labelledRing?.segments[props.index];
          if (
            !viewLabels ||
            compact ||
            !labelledRing ||
            !segment ||
            segment.isGap
          ) {
            return null;
          }
          const { totalAmount } = labelledRing.level;
          const percent = totalAmount ? segment.value / totalAmount : 0;
          const radius = (labelledRing.innerRadius + outerRadius) / 2;
          const cx = Number(props.cx);
          const cy = Number(props.cy);
          const x = cx + radius * Math.cos(-(props.midAngle ?? 0) * RADIAN);
          const y = cy + radius * Math.sin(-(props.midAngle ?? 0) * RADIAN);
          return renderCustomLabel(
            x,
            y,
            x > cx ? 'start' : 'end',
            `${(percent * 100).toFixed(0)}%`,
            adjustTextSize({ sized: Math.min(cx, cy), type: 'donut' }),
            percent,
            0.05,
            theme.reportsInnerLabel,
          );
        };

        return (
          <div>
            <PieChart
              responsive
              width={width}
              height={height}
              className={sectorCursor}
              // Recharts' keyboard support marks the same sector active in every
              // ring, so all of them would be highlighted at once
              accessibilityLayer={false}
            >
              {/* Drives each sector's isActive; the label is the tooltip */}
              <Tooltip content={() => null} active />
              {rings.map(ring => (
                <Pie
                  key={ring.key}
                  {...animationProps}
                  data={ring.segments}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={ring.innerRadius}
                  outerRadius={ring.outerRadius}
                  labelLine={false}
                  label={ring === labelledRing ? renderLabel : undefined}
                  shape={renderSegment(ring)}
                  onClick={(_: unknown, index: number) => {
                    const segment = ring.segments[index];
                    if (segment) {
                      onSelect(
                        `${ring.key}-${index}`,
                        ring.level.slots[segment.slotIndex],
                        compact,
                      );
                    }
                  }}
                />
              ))}
            </PieChart>
          </div>
        );
      }}
    </Container>
  );
}

// Each level gets a baseline ring then an amount ring, outwards. With more
// than one level the baseline rings are half as wide, and the inner level is
// highlighted in the hole while the outer one is highlighted outside the
// chart, so neither highlight covers another ring.
function getRings(
  levels: Level[],
  innerRadius: number,
  outerRadius: number,
): Ring[] {
  const isNested = levels.length > 1;
  const baselineWidth = isNested ? 1 : 2;
  const amountWidth = 2;
  const unit =
    (outerRadius - innerRadius) /
    (levels.length * (baselineWidth + amountWidth));

  return levels.flatMap((level, levelIndex): Ring[] => {
    const levelInner =
      innerRadius + levelIndex * (baselineWidth + amountWidth) * unit;
    const baselineOuter = levelInner + baselineWidth * unit;
    const ring = (isBaseline: boolean): Ring => ({
      key: `${level.key}-${isBaseline ? 'baseline' : 'amount'}`,
      level,
      segments: getSegments(level.slots, isBaseline),
      isBaseline,
      innerRadius: isBaseline ? levelInner : baselineOuter,
      outerRadius: isBaseline
        ? baselineOuter
        : baselineOuter + amountWidth * unit,
      expandInward: isNested ? levelIndex === 0 : isBaseline,
    });
    return [ring(true), ring(false)];
  });
}

// Groups take up the room of their categories, so each category sits within
// its group's slice
function getCategoryGroupLevels(
  groups: GroupedEntity[],
  {
    colorMap,
    balanceTypeOp,
    dates,
  }: {
    colorMap: Map<string | null, string>;
    balanceTypeOp: balanceTypeOpType;
    dates: Pick<Drilldown, 'startDate' | 'endDate'>;
  },
): Level[] {
  const groupSlots: Slot[] = [];
  const categorySlots: Slot[] = [];
  for (const group of groups) {
    const groupCategories = group.categories ?? [];
    const slots = getSlots(groupCategories, {
      colors: groupCategories.map(
        category => colorMap.get(category.id) ?? theme.pageTextLight,
      ),
      balanceTypeOp,
      field: 'category',
      dates,
    });
    if (slots.length === 0) {
      continue;
    }

    categorySlots.push(...slots);
    groupSlots.push({
      name: group.name,
      color: colorMap.get(group.id) ?? theme.pageTextLight,
      amount: sum(slots, slot => slot.amount),
      baseline: sum(slots, slot => slot.baseline),
      size: sum(slots, slot => slot.size),
      change: group[balanceTypeOp],
      drilldown: getDrilldown(group, 'group', dates),
    });
  }

  return [getLevel('group', groupSlots), getLevel('category', categorySlots)];
}

function getLevel(key: string, slots: Slot[]): Level {
  return {
    key,
    slots,
    totalAmount: sum(slots, slot => slot.amount),
    totalBaseline: sum(slots, slot => slot.baseline),
  };
}

// Amounts are drawn as sizes, so spending is flipped like other donuts, and
// anything that comes out negative can't be drawn
function getSlots(
  items: ReadonlyArray<GroupedEntity | IntervalEntity>,
  {
    colors,
    balanceTypeOp,
    field,
    dates,
  }: {
    colors: string[];
    balanceTypeOp: balanceTypeOpType;
    field: string;
    dates: Pick<Drilldown, 'startDate' | 'endDate'>;
  },
): Slot[] {
  const sign = getSpendingSign(balanceTypeOp);

  return items.flatMap((item, index) => {
    const breakdown = item.baseline;
    if (!breakdown) {
      return [];
    }

    const amount = Math.max(
      sign * (breakdown.projected ?? breakdown.actual)[balanceTypeOp],
      0,
    );
    const baseline = Math.max(sign * breakdown.expected[balanceTypeOp], 0);
    if (amount === 0 && baseline === 0) {
      return [];
    }

    return [
      {
        name: 'intervalData' in item ? item.name : item.date,
        color: colors[index] ?? theme.pageTextLight,
        amount,
        baseline,
        size: Math.max(amount, baseline),
        change: item[balanceTypeOp],
        drilldown: getDrilldown(item, field, dates),
      },
    ];
  });
}

// Interval slices drill down by their own date range instead of a field
function getDrilldown(
  item: GroupedEntity | IntervalEntity,
  field: string,
  dates: Pick<Drilldown, 'startDate' | 'endDate'>,
): Drilldown {
  return 'intervalData' in item
    ? {
        ...dates,
        field,
        id: item.id,
        uncategorizedId: item.uncategorizedId,
        bucketTagNames: item.bucketTagNames,
      }
    : {
        startDate: item.intervalStartDate ?? dates.startDate,
        endDate: item.intervalEndDate ?? dates.endDate,
      };
}

// A hovered gap highlights its slot's value, which ends where the gap starts.
// A slot with nothing to show highlights the gap across it instead.
function getHighlightAngles(
  sector: PieSectorShapeProps,
  segment: Segment,
  value: number,
) {
  if (!segment.isGap || value === 0 || segment.value === 0) {
    return {};
  }

  const degreesPerUnit = (sector.endAngle - sector.startAngle) / segment.value;
  const startAngle = sector.startAngle - value * degreesPerUnit;
  const endAngle = sector.startAngle;
  return { startAngle, endAngle, midAngle: (startAngle + endAngle) / 2 };
}

function getSegmentOpacity(segment: Segment, isBaseline: boolean) {
  if (segment.isGap) return 0;
  return isBaseline ? GHOST_OPACITY : 1;
}

function getSegments(slots: Slot[], isBaseline: boolean) {
  return slots.flatMap((slot, slotIndex): Segment[] => {
    const value = isBaseline ? slot.baseline : slot.amount;
    return [
      { slotIndex, value, isGap: false },
      { slotIndex, value: slot.size - value, isGap: true },
    ];
  });
}

function sum(slots: Slot[], getValue: (slot: Slot) => number) {
  return slots.reduce((total, slot) => total + getValue(slot), 0);
}
