import React, { type UIEventHandler } from 'react';
import { type RefProp } from 'react-spring';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { styles, theme } from '../../style';
import View from '../common/View';
import { Row, Cell } from '../table';

import { type DataEntity } from './entities';

type ReportTableTotalsProps = {
  data: DataEntity;
  scrollWidth?: number;
  balanceTypeOp: string;
  mode: string;
  monthsCount: number;
  totalScrollRef: RefProp<HTMLDivElement>;
  handleScrollTotals: UIEventHandler<HTMLDivElement>;
};

export default function ReportTableTotals({
  data,
  scrollWidth,
  balanceTypeOp,
  mode,
  monthsCount,
  totalScrollRef,
  handleScrollTotals,
}: ReportTableTotalsProps) {
  const average = amountToInteger(data[balanceTypeOp]) / monthsCount;
  return (
    <View
      innerRef={totalScrollRef}
      onScroll={handleScrollTotals}
      style={{
        overflowX: 'auto',
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
        justifyContent: 'center',
      }}
    >
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
            ...styles.tnum,
          }}
          value="Totals"
          width="flex"
        />
        {mode === 'time'
          ? data.monthData.map(item => {
              return (
                <Cell
                  style={{
                    minWidth: 85,
                    ...styles.tnum,
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
                    ...styles.tnum,
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
                    ...styles.tnum,
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
            ...styles.tnum,
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
            ...styles.tnum,
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
    </View>
  );
}
