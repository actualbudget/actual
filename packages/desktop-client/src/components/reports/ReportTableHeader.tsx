import React from 'react';

import * as d from 'date-fns';

import { theme } from '../../style';
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
                }}
                value={'Assets'}
                width="flex"
              />
              <Cell
                style={{
                  minWidth: 85,
                }}
                value={'Debts'}
                width="flex"
              />
            </>
          )}
      <Cell
        style={{
          minWidth: 85,
        }}
        value={'Totals'}
        width="flex"
      />
      <Cell
        style={{
          minWidth: 85,
        }}
        value={'Average'}
        width="flex"
      />
      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}
