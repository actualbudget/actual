import React, {
  type RefObject,
  type UIEventHandler,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type balanceTypeOpType,
  type IntervalEntity,
} from 'loot-core/types/models';

import { ReportOptions } from '@desktop-client/components/reports/ReportOptions';
import { Row, Cell } from '@desktop-client/components/table';

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
}: ReportTableHeaderProps) {
  const { t } = useTranslation();
  return (
    <Row
      collapsed={true}
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
          valueStyle={compactStyle}
          value={
            groupBy === 'Interval'
              ? ReportOptions.intervalMap.get(interval)
              : groupBy
          }
        />
        {mode === 'time'
          ? data.map((header, index) => {
              return (
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                  key={index}
                  value={header.date}
                  textAlign="right"
                  width="flex"
                />
              );
            })
          : balanceTypeOp === 'totalTotals' && (
              <>
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                  value={t('Deposits')}
                  textAlign="right"
                  width="flex"
                />
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
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
          valueStyle={compactStyle}
          value={t('Totals')}
          textAlign="right"
          width="flex"
        />
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          value={t('Average')}
          textAlign="right"
          width="flex"
        />
      </View>
    </Row>
  );
}
