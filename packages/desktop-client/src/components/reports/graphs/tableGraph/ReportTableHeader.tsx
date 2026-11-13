import React from 'react';
import type { CSSProperties, RefObject, UIEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  balanceTypeOpType,
  IntervalEntity,
} from '@actual-app/core/types/models';

import { useFormatComparisonWindow } from '#components/reports/graphs/useFormatComparisonWindow';
import { ReportOptions } from '#components/reports/ReportOptions';
import { Cell, Row, ROW_HEIGHT } from '#components/table';

const COLUMN_MIN_WIDTH = 85;
// Current, comparison and change cells of a split interval. Change is wider
// for its percentage.
export const SPLIT_MIN_WIDTHS = [95, 95, 140];

/**
 * Split tables grow each column in proportion to its minimum width, so a
 * header group is always as wide as the cells under it.
 */
export function splitColumnStyle(minWidth: number) {
  return { minWidth, flexGrow: minWidth / COLUMN_MIN_WIDTH };
}

// The line under a group's label stops short of the next group
const GROUP_DIVIDER_INSET = 8;

type ReportTableHeaderProps = {
  groupBy: string;
  interval: string;
  data: IntervalEntity[];
  balanceTypeOp: balanceTypeOpType;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  mode: string;
  showComparison?: boolean;
  showProjected?: boolean;
  // The comparison is the average of what was budgeted
  budgetedComparison?: boolean;
  // Split each interval into current, comparison and change sub-columns
  splitIntervals?: boolean;
};

export function ReportTableHeader({
  groupBy,
  interval,
  data,
  balanceTypeOp,
  headerScrollRef,
  handleScroll,
  compact,
  style,
  compactStyle,
  mode,
  showComparison = false,
  showProjected = false,
  budgetedComparison = false,
  splitIntervals = false,
}: ReportTableHeaderProps) {
  const { t } = useTranslation();
  const formatComparisonWindow = useFormatComparisonWindow();
  // Labels beside split intervals sit level with the sub-column labels, so the
  // line under each date doesn't look like it runs on from them
  const labelStyle = splitIntervals
    ? { ...compactStyle, paddingTop: ROW_HEIGHT }
    : compactStyle;

  // A label over sub-column labels, with a line between them
  const renderGroup = (
    key: string | number,
    label: string,
    subLabels: { label: string; minWidth: number; title?: string }[],
  ) => {
    const minWidth = subLabels.reduce((sum, sub) => sum + sub.minWidth, 0);
    return (
      <View key={key} style={{ ...splitColumnStyle(minWidth), flexBasis: 0 }}>
        <Cell
          value={label}
          title={label}
          textAlign="center"
          style={{ height: ROW_HEIGHT, borderBottomWidth: 0 }}
        />
        <View
          style={{
            height: 1,
            marginLeft: GROUP_DIVIDER_INSET,
            marginRight: GROUP_DIVIDER_INSET,
            backgroundColor: theme.tableBorder,
          }}
        />
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {subLabels.map((sub, subIndex) => (
            <Cell
              key={subIndex}
              style={{ ...splitColumnStyle(sub.minWidth), borderTopWidth: 0 }}
              value={sub.label}
              title={sub.title}
              textAlign="right"
              width="flex"
            />
          ))}
        </View>
      </View>
    );
  };
  // Total tables keep real amounts and add a change column beside them
  const rangeColumns: { label: string; title?: string }[] = [
    { label: t('Totals') },
    ...(showComparison && showProjected
      ? [
          {
            label: t('Projected'),
            title: t('The amount so far, scaled up to the whole range'),
          },
        ]
      : []),
    ...(showComparison
      ? [
          {
            label: t('Change'),
            title:
              mode === 'time'
                ? budgetedComparison
                  ? t('The average compared with the budget per interval')
                  : t('The average change from the comparison per interval')
                : budgetedComparison
                  ? t('The difference from the budget over the whole range')
                  : t(
                      'The difference from the comparison over the whole range',
                    ),
          },
        ]
      : []),
    {
      label: t('Average'),
      title:
        showComparison && mode === 'time'
          ? t('An average-length interval at the pace so far')
          : undefined,
    },
  ];

  return (
    <Row
      collapsed
      // A second row under the dates for the sub-columns
      height={splitIntervals ? ROW_HEIGHT * 2 - 1 : undefined}
      style={{
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
        ...style,
      }}
    >
      <View
        innerRef={headerScrollRef}
        onScroll={handleScroll}
        id="header"
        style={{
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '::-webkit-scrollbar': { display: 'none' },
          flexDirection: 'row',
          flex: 1,
        }}
      >
        <Cell
          style={{
            width: compact ? 80 : 125,
            flexShrink: 0,
            flexGrow: 1,
          }}
          valueStyle={labelStyle}
          value={
            groupBy === 'Interval'
              ? ReportOptions.intervalMap.get(interval)
              : groupBy
          }
        />
        {showComparison && (
          <Cell
            style={{
              minWidth: compact ? 50 : 85,
            }}
            valueStyle={labelStyle}
            value={budgetedComparison ? t('Budgeted') : t('Comparison')}
            title={
              budgetedComparison
                ? mode === 'time'
                  ? t('The average budgeted over one interval')
                  : t('The average budgeted over the same length of time')
                : mode === 'time'
                  ? t('The comparison average over one interval')
                  : t('The comparison average over the same number of days')
            }
            textAlign="right"
            width="flex"
          />
        )}
        {mode === 'time'
          ? data.map((header, index) => {
              if (splitIntervals) {
                // Range comparisons compare every interval with the same range,
                // so only offset windows go beside the date
                const comparisonWindow = formatComparisonWindow(
                  header.comparisonStartDate,
                  header.comparisonEndDate,
                );
                const groupLabel = comparisonWindow
                  ? t('{{date}} vs {{comparisonWindow}}', {
                      date: header.date,
                      comparisonWindow,
                    })
                  : header.date;
                const comparisonLabel = budgetedComparison
                  ? t('Budgeted')
                  : t('Comparison');
                return renderGroup(
                  index,
                  groupLabel,
                  [t('Current'), comparisonLabel, t('Change')].map(
                    (label, subIndex) => ({
                      label,
                      minWidth: SPLIT_MIN_WIDTHS[subIndex],
                    }),
                  ),
                );
              }
              return (
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={labelStyle}
                  key={index}
                  value={header.date}
                  textAlign="right"
                  width="flex"
                />
              );
            })
          : ['totalTotals', 'totalBudgeted'].includes(balanceTypeOp) && (
              <>
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={labelStyle}
                  value={t('Deposits')}
                  textAlign="right"
                  width="flex"
                />
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={labelStyle}
                  value={t('Payments')}
                  textAlign="right"
                  width="flex"
                />
              </>
            )}
        {splitIntervals
          ? renderGroup(
              'range',
              t('Whole range'),
              rangeColumns.map(column => ({
                ...column,
                minWidth: COLUMN_MIN_WIDTH,
              })),
            )
          : rangeColumns.map(column => (
              <Cell
                key={column.label}
                style={{
                  minWidth: compact ? 50 : COLUMN_MIN_WIDTH,
                }}
                valueStyle={labelStyle}
                value={column.label}
                title={column.title}
                textAlign="right"
                width="flex"
              />
            ))}
      </View>
    </Row>
  );
}
