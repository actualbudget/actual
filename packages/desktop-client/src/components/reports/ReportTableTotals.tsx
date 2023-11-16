import React from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { theme } from '../../style';
import { Row, Cell } from '../table';

export default function ReportTableTotals({
  data,
  scrollWidth,
  balanceTypeOp,
  mode,
  monthsCount,
}) {
  const average = amountToInteger(data[balanceTypeOp]) / monthsCount;
  return (
    <Row
      collapsed={true}
      style={{
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
      }}
    >
      <Cell
        style={{
          minWidth: 125,
        }}
        value={'Totals'}
        width="flex"
      />
      {mode === 'time'
        ? data.monthData.map(item => {
            return (
              <Cell
                style={{
                  minWidth: 85,
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
                  minWidth: 85,
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
                  minWidth: 85,
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
          minWidth: 85,
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
          minWidth: 85,
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
