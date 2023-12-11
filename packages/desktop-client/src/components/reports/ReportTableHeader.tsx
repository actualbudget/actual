import React, { type Ref } from 'react';

import * as d from 'date-fns';

import { styles, theme } from '../../style';
import View from '../common/View';
import { Row, Cell } from '../table';

import { type Month } from './entities';

type ReportTableHeaderProps = {
  scrollWidth?: number;
  groupBy: string;
  interval?: Month[];
  balanceType: string;
  headerScrollRef?: Ref<HTMLDivElement>;
};

export default function ReportTableHeader({
  scrollWidth,
  groupBy,
  interval,
  balanceType,
  headerScrollRef,
}: ReportTableHeaderProps) {
  return (
    <View
      innerRef={headerScrollRef}
      style={{
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '::-webkit-scrollbar': { display: 'none' },
        justifyContent: 'center',
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
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
          value={groupBy}
          width="flex"
        />
        {interval
          ? interval.map((header, index) => {
              return (
                <Cell
                  style={{
                    minWidth: 85,
                    ...styles.tnum,
                  }}
                  key={index}
                  // eslint-disable-next-line rulesdir/typography
                  value={d.format(d.parseISO(`${header}-01`), "MMM ''yy")}
                  width="flex"
                />
              );
            })
          : balanceType === 'Net' && (
              <>
                <Cell
                  style={{
                    minWidth: 85,
                    ...styles.tnum,
                  }}
                  value={'Assets'}
                  width="flex"
                />
                <Cell
                  style={{
                    minWidth: 85,
                    ...styles.tnum,
                  }}
                  value={'Debts'}
                  width="flex"
                />
              </>
            )}
        <Cell
          style={{
            minWidth: 85,
            ...styles.tnum,
          }}
          value={'Totals'}
          width="flex"
        />
        <Cell
          style={{
            minWidth: 85,
            ...styles.tnum,
          }}
          value={'Average'}
          width="flex"
        />
        {scrollWidth > 0 && <Cell width={scrollWidth} />}
      </Row>
    </View>
  );
}
