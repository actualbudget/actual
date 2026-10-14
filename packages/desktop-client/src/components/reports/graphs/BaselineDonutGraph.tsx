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
import { DonutSector } from './DonutSector';
import { formatChange } from './formatChange';
import { getChangeColor } from './getChangeColor';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

const RADIAN = Math.PI / 180;

const sectorCursor = css({ '& .recharts-pie-sector': { cursor: 'pointer' } });

// One slice of the chart, sized by the larger of its amount and baseline
type Slot = {
  item: GroupedEntity | IntervalEntity;
  name: string;
  color: string;
  amount: number;
  baseline: number;
  change: number;
};

// A ring is drawn as each slot's value then a gap filling the rest of the
// slot, so both rings' slots line up
type Segment = {
  slotIndex: number;
  value: number;
  isGap: boolean;
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
 * A donut comparing amounts with a baseline: the outer ring is each amount
 * and the faint inner ring its baseline, both starting from the same angle
 * in a slice sized by whichever is larger.
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

  const items: ReadonlyArray<GroupedEntity | IntervalEntity> =
    (groupBy === 'Interval' ? data.intervalData : data.data) ?? [];
  const slots = getSlots(items, {
    colors: (data.legend ?? []).map(entry => entry.color),
    balanceTypeOp,
  });
  const totalAmount = slots.reduce((sum, slot) => sum + slot.amount, 0);
  const totalBaseline = slots.reduce((sum, slot) => sum + slot.baseline, 0);
  const outerRing = getRing(slots, slot => slot.amount);
  const innerRing = getRing(slots, slot => slot.baseline);

  const onSelect = (tapKey: string, slotIndex: number, compact: boolean) => {
    if (isTouchDevice() && lastTapRef.current !== tapKey) {
      lastTapRef.current = tapKey;
      return;
    }
    if (compact && !showTooltip) {
      return;
    }

    const { item } = slots[slotIndex];
    // Interval slices drill down by their own date range instead of a field
    const drilldown =
      'intervalData' in item
        ? {
            startDate: data.startDate ?? '',
            endDate: data.endDate,
            field: groupBy.toLowerCase(),
            id: item.id,
            uncategorizedId: item.uncategorizedId,
            bucketTagNames: item.bucketTagNames,
          }
        : {
            startDate: item.intervalStartDate ?? data.startDate ?? '',
            endDate: item.intervalEndDate ?? data.endDate,
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
      scopeTagNames: data.scopeTagNames,
    });
  };

  return (
    <Container style={style}>
      {(width, height) => {
        const minDim = Math.min(width, height);
        const compact = height <= 300 || width <= 300;
        const innerRadius = minDim * (compact ? 0.16 : 0.2);
        const midRadius = minDim * (compact ? 0.27 : 0.31);
        const outerRadius = minDim * (compact ? 0.36 : 0.42);

        const showActiveShape = showTooltip && width >= 220 && height >= 130;

        // A hovered segment is drawn like other donuts' active sectors,
        // labelled with its own ring's values. Gaps highlight the slot's
        // empty part and stay transparent, and the baseline stays faint.
        const renderSegment =
          (ring: Segment[], isBaseline: boolean) =>
          (props: PieSectorShapeProps) => {
            const segment = ring[props.index];
            if (!segment) {
              return null;
            }

            const slot = slots[segment.slotIndex];
            const value = isBaseline ? slot.baseline : slot.amount;
            const total = isBaseline ? totalBaseline : totalAmount;
            const ActiveShape = compact
              ? DonutActiveShapeMobile
              : DonutActiveShapeDesktop;
            const highlight =
              props.isActive && showActiveShape ? (
                <ActiveShape
                  // Recharts' sector props carry everything else it needs
                  {...(props as unknown as DonutActiveShapeProps)}
                  {...getHighlightAngles(props, segment, value)}
                  fill={slot.color}
                  payload={{ name: slot.name }}
                  value={value}
                  valueSuffix={isBaseline ? t('baseline') : undefined}
                  percent={total ? value / total : 0}
                  expandInward={isBaseline}
                  chartInnerRadius={innerRadius}
                  chartMidRadius={midRadius}
                  chartOuterRadius={outerRadius}
                  detail={{
                    text: t('{{change}} vs baseline', {
                      change: formatChange(slot.change, format),
                    }),
                    color: getChangeColor(slot.change),
                  }}
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

        const pieProps = (ring: Segment[], name: string) => ({
          ...animationProps,
          data: ring,
          dataKey: 'value',
          startAngle: 90,
          endAngle: -270,
          onClick: (_: unknown, index: number) => {
            if (ring[index]) {
              onSelect(`${name}-${index}`, ring[index].slotIndex, compact);
            }
          },
        });

        const renderLabel = (props: PieLabelRenderProps) => {
          const segment = outerRing[props.index];
          if (!viewLabels || compact || !segment || segment.isGap) {
            return null;
          }
          const percent = totalAmount ? segment.value / totalAmount : 0;
          const radius = midRadius + (outerRadius - midRadius) * 0.5;
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
            >
              {/* Drives each sector's isActive; the label is the tooltip */}
              <Tooltip content={() => null} active />
              <Pie
                {...pieProps(innerRing, 'baseline')}
                innerRadius={innerRadius}
                outerRadius={midRadius}
                shape={renderSegment(innerRing, true)}
              />
              <Pie
                {...pieProps(outerRing, 'amount')}
                innerRadius={midRadius}
                outerRadius={outerRadius}
                labelLine={false}
                label={renderLabel}
                shape={renderSegment(outerRing, false)}
              />
            </PieChart>
          </div>
        );
      }}
    </Container>
  );
}

// Amounts are drawn as sizes, so spending is flipped like other donuts, and
// anything that comes out negative can't be drawn
function getSlots(
  items: ReadonlyArray<GroupedEntity | IntervalEntity>,
  {
    colors,
    balanceTypeOp,
  }: {
    colors: string[];
    balanceTypeOp: balanceTypeOpType;
  },
): Slot[] {
  const sign =
    balanceTypeOp === 'totalDebts' || balanceTypeOp === 'netDebts' ? -1 : 1;

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
        item,
        name: 'intervalData' in item ? item.name : item.date,
        color: colors[index] ?? theme.pageTextLight,
        amount,
        baseline,
        change: item[balanceTypeOp],
      },
    ];
  });
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
  return isBaseline ? 0.3 : 1;
}

function getRing(slots: Slot[], getValue: (slot: Slot) => number) {
  return slots.flatMap((slot, slotIndex): Segment[] => {
    const value = getValue(slot);
    const size = Math.max(slot.amount, slot.baseline);
    return [
      { slotIndex, value, isGap: false },
      { slotIndex, value: size - value, isGap: true },
    ];
  });
}
