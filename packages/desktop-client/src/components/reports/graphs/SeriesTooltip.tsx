import React from 'react';
import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import type {
  IntervalEntity,
  LegendEntity,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import {
  getAmountKey,
  getBaselineKey,
  getChangeKey,
} from '#components/reports/baselineRange';
import type { FormatType } from '#hooks/useFormat';

import { formatChange } from './formatChange';
import { getChangeColor } from './getChangeColor';
import { SeriesTooltipRow } from './SeriesTooltipRow';
import type { SeriesRow } from './SeriesTooltipRow';
import { TooltipCard } from './TooltipCard';

const maxCompactRows = 5;

const dividerStyle: CSSProperties = {
  gridColumn: '1 / -1',
  margin: '5px 0',
  borderTop: `1px solid ${theme.menuBorder}`,
};

const headerStyle: CSSProperties = {
  textAlign: 'right',
  fontSize: 12,
  color: theme.menuItemTextHeader,
};

type SeriesTooltipProps = {
  // Recharts passes these to tooltip content
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: IntervalEntity }>;
  legend: LegendEntity[];
  format: (value: unknown, type: FormatType) => string;
  compact: boolean;
  // The series under the pointer, which is underlined and kept when
  // compact tooltips trim their rows
  hoveredKey: string;
  // Lines list the largest values first; stacks list top to bottom
  order: 'value' | 'stack';
  hideZero?: boolean;
};

/**
 * A tooltip listing every series in one interval of a time graph. Against a
 * baseline, each series shows its amount and how it compares, then the
 * interval's baseline summary; otherwise the series add up to a total.
 */
export function SeriesTooltip({
  active,
  payload,
  legend,
  format,
  compact,
  hoveredKey,
  order,
  hideZero = false,
}: SeriesTooltipProps) {
  const interval = payload?.[0]?.payload;
  if (!active || !interval) {
    return null;
  }

  // Series values sit beside the interval's own fields under their keys
  const values = interval as unknown as Record<
    string,
    number | null | undefined
  >;
  const breakdown = interval.baseline;
  // Intervals that haven't started only have a baseline to list
  const isUpcoming = !!breakdown?.upcoming;
  const hasChangeColumn = !!breakdown && !isUpcoming;

  const getRow = (entry: LegendEntity): SeriesRow | null => {
    const key = entry.dataKey;
    const value = breakdown
      ? values[isUpcoming ? getBaselineKey(key) : getAmountKey(key)]
      : values[key];
    if (value == null || (hideZero && value === 0)) {
      return null;
    }
    return {
      key,
      name: entry.name,
      color: entry.color,
      value,
      change: hasChangeColumn ? (values[getChangeKey(key)] ?? 0) : undefined,
    };
  };

  // Stacks are drawn last series first, so legend order runs top to bottom
  const rows = legend.flatMap(entry => getRow(entry) ?? []);
  if (order === 'value') {
    rows.sort((a, b) => b.value - a.value);
  }
  if (rows.length === 0 && !isUpcoming) {
    return null;
  }

  const visibleRows = compact ? trimRows(rows, hoveredKey) : rows;
  // Totals cover every series, including any left out of the rows
  const sumOf = (getKey: (key: string) => string) =>
    legend.reduce(
      (sum, entry) => sum + (values[getKey(entry.dataKey)] ?? 0),
      0,
    );
  const total = sumOf(key =>
    breakdown && !isUpcoming ? getAmountKey(key) : key,
  );

  return (
    <TooltipCard title={interval.date}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasChangeColumn ? 'auto auto auto' : 'auto auto',
          columnGap: 15,
        }}
      >
        {breakdown && (
          <>
            <span />
            <span style={headerStyle}>
              {isUpcoming ? <Trans>Baseline</Trans> : <Trans>Amount</Trans>}
            </span>
            {hasChangeColumn && (
              <span style={headerStyle}>
                <Trans>vs baseline</Trans>
              </span>
            )}
          </>
        )}
        {visibleRows.map(row => (
          <SeriesTooltipRow
            key={row.key}
            row={row}
            isHovered={row.key === hoveredKey}
            format={format}
          />
        ))}
        {visibleRows.length < rows.length && (
          <span style={{ gridColumn: '1 / -1' }}>...</span>
        )}
        <span style={dividerStyle} />
        {breakdown && (
          <>
            <span>
              <Trans>Baseline</Trans>
            </span>
            <FinancialText style={{ textAlign: 'right' }}>
              {format(sumOf(getBaselineKey), 'financial')}
            </FinancialText>
            {hasChangeColumn && <span />}
          </>
        )}
        {!isUpcoming && (
          <>
            <span style={{ fontWeight: 600 }}>
              <Trans>Total</Trans>
            </span>
            <FinancialText style={{ textAlign: 'right', fontWeight: 600 }}>
              {format(total, 'financial')}
            </FinancialText>
            {hasChangeColumn && (
              <FinancialText
                style={{
                  textAlign: 'right',
                  fontWeight: 600,
                  color: getChangeColor(sumOf(getChangeKey)),
                }}
              >
                {formatChange(sumOf(getChangeKey), format)}
              </FinancialText>
            )}
          </>
        )}
      </div>
    </TooltipCard>
  );
}

// Compact tooltips keep the first rows, swapping in the hovered series if it
// would otherwise be cut
function trimRows(rows: SeriesRow[], hoveredKey: string) {
  if (rows.length <= maxCompactRows) {
    return rows;
  }

  const hoveredIndex = rows.findIndex(row => row.key === hoveredKey);
  if (hoveredIndex >= maxCompactRows) {
    return [...rows.slice(0, maxCompactRows - 1), rows[hoveredIndex]];
  }
  return rows.slice(0, maxCompactRows);
}
