import React from 'react';

import * as d from 'date-fns';

import { styles, theme } from '../../style';
import { Row, Cell } from '../table';

export default function ReportTableHeader({
  scrollWidth,
  groupBy,
  interval,
  balanceType,
}) {
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
          ...styles.tnum,
        }}
        value={groupBy}
        width="flex"
      />
      {interval
        ? interval.map(header => {
            return (
              <Cell
                style={{
                  minWidth: 85,
                  ...styles.tnum,
                }}
                key={header}
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
  );
}
