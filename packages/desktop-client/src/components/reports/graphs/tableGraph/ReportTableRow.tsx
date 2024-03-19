import React, { memo } from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';
import { type DataEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { Row, Cell } from '../../../table';

type ReportTableRowProps = {
  item: DataEntity;
  balanceTypeOp: 'totalAssets' | 'totalDebts' | 'totalTotals';
  groupByItem: 'id' | 'name';
  mode: string;
  intervalsCount: number;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
};

export const ReportTableRow = memo(
  ({
    item,
    balanceTypeOp,
    groupByItem,
    mode,
    intervalsCount,
    compact,
    style,
    compactStyle,
  }: ReportTableRowProps) => {
    const average = amountToInteger(item[balanceTypeOp]) / intervalsCount;
    return (
      <Row
        key={item.id}
        collapsed={true}
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
          ...style,
        }}
      >
        <Cell
          value={item[groupByItem]}
          title={item[groupByItem].length > 12 ? item[groupByItem] : undefined}
          style={{
            width: compact ? 80 : 125,
            flexShrink: 0,
          }}
          valueStyle={compactStyle}
        />
        {item.intervalData && mode === 'time'
          ? item.intervalData.map(intervalItem => {
              return (
                <Cell
                  key={amountToCurrency(intervalItem[balanceTypeOp])}
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                  value={amountToCurrency(intervalItem[balanceTypeOp])}
                  title={
                    Math.abs(intervalItem[balanceTypeOp]) > 100000
                      ? amountToCurrency(intervalItem[balanceTypeOp])
                      : undefined
                  }
                  width="flex"
                  privacyFilter
                />
              );
            })
          : balanceTypeOp === 'totalTotals' && (
              <>
                <Cell
                  value={amountToCurrency(item.totalAssets)}
                  title={
                    Math.abs(item.totalAssets) > 100000
                      ? amountToCurrency(item.totalAssets)
                      : undefined
                  }
                  width="flex"
                  privacyFilter
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                />
                <Cell
                  value={amountToCurrency(item.totalDebts)}
                  title={
                    Math.abs(item.totalDebts) > 100000
                      ? amountToCurrency(item.totalDebts)
                      : undefined
                  }
                  width="flex"
                  privacyFilter
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                />
              </>
            )}
        <Cell
          value={amountToCurrency(item[balanceTypeOp])}
          title={
            Math.abs(item[balanceTypeOp]) > 100000
              ? amountToCurrency(item[balanceTypeOp])
              : undefined
          }
          style={{
            fontWeight: 600,
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          width="flex"
          privacyFilter
        />
        <Cell
          value={integerToCurrency(Math.round(average))}
          title={
            Math.abs(Math.round(average / 100)) > 100000
              ? integerToCurrency(Math.round(average))
              : undefined
          }
          style={{
            fontWeight: 600,
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          width="flex"
          privacyFilter
        />
      </Row>
    );
  },
);

ReportTableRow.displayName = 'ReportTableRow';
