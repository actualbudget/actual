import React from 'react';
import type { CSSProperties, RefObject, UIEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  balanceTypeOpType,
  IntervalEntity,
} from '@actual-app/core/types/models';

import { useFormatBaselineWindow } from '#components/reports/graphs/useFormatBaselineWindow';
import { ReportOptions } from '#components/reports/ReportOptions';
import { Cell, Row, ROW_HEIGHT } from '#components/table';

// Every sub-column of a split interval has the same width, so each header
// group lines up with the three cells under it
export const SUB_COLUMN_MIN_WIDTH = 140;

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
  showBaseline?: boolean;
  showProjected?: boolean;
  // The baseline is the average of what was budgeted
  budgetedBaseline?: boolean;
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
  showBaseline = false,
  showProjected = false,
  budgetedBaseline = false,
  splitIntervals = false,
}: ReportTableHeaderProps) {
  const { t } = useTranslation();
  const formatBaselineWindow = useFormatBaselineWindow();
  // Labels beside split intervals sit level with the sub-column labels, so the
  // line under each date doesn't look like it runs on from them
  const labelStyle = splitIntervals
    ? { ...compactStyle, paddingTop: ROW_HEIGHT - 1 }
    : compactStyle;
  // Total tables keep real amounts and add a change column beside them
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
        {showBaseline && (
          <Cell
            style={{
              minWidth: compact ? 50 : 85,
            }}
            valueStyle={labelStyle}
            value={budgetedBaseline ? t('Budgeted') : t('Baseline')}
            title={
              budgetedBaseline
                ? mode === 'time'
                  ? t('The average budgeted over one interval')
                  : t('The average budgeted over the same length of time')
                : mode === 'time'
                  ? t('The baseline average over one interval')
                  : t('The baseline average over the same number of days')
            }
            textAlign="right"
            width="flex"
          />
        )}
        {mode === 'time'
          ? data.map((header, index) => {
              if (splitIntervals) {
                // Range baselines compare every interval with the same range,
                // so only offset windows go beside the date
                const baselineWindow = formatBaselineWindow(
                  header.baselineStartDate,
                  header.baselineEndDate,
                );
                const groupLabel = baselineWindow
                  ? t('{{date}} vs {{baselineWindow}}', {
                      date: header.date,
                      baselineWindow,
                    })
                  : header.date;
                return (
                  <View
                    key={index}
                    style={{
                      flex: 3,
                      flexBasis: 0,
                      minWidth: SUB_COLUMN_MIN_WIDTH * 3,
                    }}
                  >
                    <Cell
                      value={groupLabel}
                      title={groupLabel}
                      textAlign="center"
                      style={{ height: ROW_HEIGHT }}
                    />
                    <View
                      style={{ flexDirection: 'row', flex: 1, marginTop: -1 }}
                    >
                      {[
                        t('Current'),
                        budgetedBaseline ? t('Budgeted') : t('Baseline'),
                        t('Change'),
                      ].map((label, subIndex) => (
                        <Cell
                          key={subIndex}
                          style={{ minWidth: SUB_COLUMN_MIN_WIDTH }}
                          value={label}
                          textAlign="right"
                          width="flex"
                        />
                      ))}
                    </View>
                  </View>
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
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={labelStyle}
          value={t('Totals')}
          textAlign="right"
          width="flex"
        />
        {showBaseline && showProjected && (
          <Cell
            style={{
              minWidth: compact ? 50 : 85,
            }}
            valueStyle={labelStyle}
            value={t('Projected')}
            title={t('The amount so far, scaled up to the whole range')}
            textAlign="right"
            width="flex"
          />
        )}
        {showBaseline && (
          <Cell
            style={{
              minWidth: compact ? 50 : 85,
            }}
            valueStyle={labelStyle}
            value={t('Change')}
            title={
              mode === 'time'
                ? budgetedBaseline
                  ? t('The average compared with the budget per interval')
                  : t('The average compared with the baseline per interval')
                : budgetedBaseline
                  ? t('The difference from the budget over the whole range')
                  : t('The difference from the baseline over the whole range')
            }
            textAlign="right"
            width="flex"
          />
        )}
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={labelStyle}
          value={t('Average')}
          title={
            showBaseline && mode === 'time'
              ? t('An average-length interval at the pace so far')
              : undefined
          }
          textAlign="right"
          width="flex"
        />
      </View>
    </Row>
  );
}
