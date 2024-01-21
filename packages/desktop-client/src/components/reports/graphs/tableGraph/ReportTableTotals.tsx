// @ts-strict-ignore
import React, { type UIEventHandler, useLayoutEffect, useState } from 'react';
import { type RefProp } from 'react-spring';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';
import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { styles, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row, Cell } from '../../../table';

type ReportTableTotalsProps = {
  data: GroupedEntity;
  balanceTypeOp: string;
  mode: string;
  monthsCount: number;
  totalScrollRef: RefProp<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  compact: boolean;
};

export function ReportTableTotals({
  data,
  balanceTypeOp,
  mode,
  monthsCount,
  totalScrollRef,
  handleScroll,
  compact,
}: ReportTableTotalsProps) {
  const [scrollWidthTotals, setScrollWidthTotals] = useState(0);

  useLayoutEffect(() => {
    if (totalScrollRef.current) {
      const [parent, child] = [
        totalScrollRef.current.offsetParent
          ? totalScrollRef.current.parentElement.scrollHeight
          : 0,
        totalScrollRef.current ? totalScrollRef.current.scrollHeight : 0,
      ];
      setScrollWidthTotals(parent > 0 && child > 0 && parent - child);
    }
  });

  const average = amountToInteger(data[balanceTypeOp]) / monthsCount;
  return (
    <Row
      collapsed={true}
      height={32 + scrollWidthTotals}
      style={{
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
        justifyContent: 'center',
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
      }}
    >
      <View
        innerRef={totalScrollRef}
        onScroll={handleScroll}
        id="total"
        style={{
          overflowX: 'auto',
          flexDirection: 'row',
          flex: 1,
        }}
      >
        <Cell
          style={{
            width: 120,
            flexShrink: 0,
            ...styles.tnum,
          }}
          value="Totals"
        />
        {mode === 'time'
          ? data.monthData.map(item => {
              return (
                <Cell
                  style={{
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
                  key={amountToCurrency(item[balanceTypeOp])}
                  value={amountToCurrency(item[balanceTypeOp])}
                  title={
                    Math.abs(item[balanceTypeOp]) > 100000
                      ? amountToCurrency(item[balanceTypeOp])
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
                  style={{
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
                  value={amountToCurrency(data.totalAssets)}
                  title={
                    Math.abs(data.totalAssets) > 100000
                      ? amountToCurrency(data.totalAssets)
                      : undefined
                  }
                  width="flex"
                  privacyFilter
                />
                <Cell
                  style={{
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
                  value={amountToCurrency(data.totalDebts)}
                  title={
                    Math.abs(data.totalDebts) > 100000
                      ? amountToCurrency(data.totalDebts)
                      : undefined
                  }
                  width="flex"
                  privacyFilter
                />
              </>
            )}
        <Cell
          style={{
            minWidth: compact ? 80 : 125,
            ...styles.tnum,
          }}
          value={amountToCurrency(data[balanceTypeOp])}
          title={
            Math.abs(data[balanceTypeOp]) > 100000
              ? amountToCurrency(data[balanceTypeOp])
              : undefined
          }
          width="flex"
          privacyFilter
        />
        <Cell
          style={{
            minWidth: compact ? 80 : 125,
            ...styles.tnum,
          }}
          value={integerToCurrency(Math.round(average))}
          title={
            Math.abs(Math.round(average / 100)) > 100000
              ? integerToCurrency(Math.round(average))
              : undefined
          }
          width="flex"
          privacyFilter
        />
      </View>
    </Row>
  );
}
