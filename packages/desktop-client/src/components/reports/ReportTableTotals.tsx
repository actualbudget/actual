import React from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { type CSSProperties } from '../../style';
import { theme } from '../../style';
import { Row, Cell } from '../table';

type ReportTableTotalsProps = {
  style?: CSSProperties;
  data;
  scrollWidth?;
  balanceTypeOp;
  mode;
  monthsCount;
  cellStyle?;
  compact?;
};

export default function ReportTableTotals({
  data,
  scrollWidth,
  balanceTypeOp,
  mode,
  monthsCount,
  style,
  cellStyle,
  compact,
}: ReportTableTotalsProps) {
  const average = amountToInteger(data[balanceTypeOp]) / monthsCount;
  return (
    <Row
      collapsed={true}
      style={{
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
        ...style,
      }}
    >
      <Cell
        style={{
          minWidth: !compact && 125,
          ...cellStyle,
        }}
        value={'Totals'}
        width="flex"
      />
      {mode === 'time'
        ? data.monthData.map(item => {
            return (
              <Cell
                style={{
                  minWidth: !compact && 85,
                  ...cellStyle,
                }}
                key={amountToCurrency(item[balanceTypeOp])}
                value={amountToCurrency(item[balanceTypeOp])}
                title={
                  Math.abs(item[balanceTypeOp]) > 100000 &&
                  amountToCurrency(item[balanceTypeOp])
                }
                width="flex"
                privacyFilter
              />
            );
          })
        : balanceTypeOp === 'totalTotals' && (
            <>
              <Cell
                style={{
                  minWidth: !compact && 85,
                  ...cellStyle,
                }}
                value={amountToCurrency(data.totalAssets)}
                title={
                  Math.abs(data.totalAssets) > 100000 &&
                  amountToCurrency(data.totalAssets)
                }
                width="flex"
              />
              <Cell
                style={{
                  minWidth: !compact && 85,
                  ...cellStyle,
                }}
                value={amountToCurrency(data.totalDebts)}
                title={
                  Math.abs(data.totalDebts) > 100000 &&
                  amountToCurrency(data.totalDebts)
                }
                width="flex"
              />
            </>
          )}
      <Cell
        style={{
          minWidth: !compact && 85,
          ...cellStyle,
        }}
        value={amountToCurrency(data[balanceTypeOp])}
        title={
          Math.abs(data[balanceTypeOp]) > 100000 &&
          amountToCurrency(data[balanceTypeOp])
        }
        width="flex"
        privacyFilter
      />
      <Cell
        style={{
          minWidth: !compact && 85,
          ...cellStyle,
        }}
        value={integerToCurrency(Math.round(average))}
        title={
          Math.abs(Math.round(average / 100)) > 100000 &&
          integerToCurrency(Math.round(average))
        }
        width="flex"
        privacyFilter
      />

      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}
