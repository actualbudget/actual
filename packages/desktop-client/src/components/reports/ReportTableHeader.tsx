import React from 'react';

import * as d from 'date-fns';

import { theme } from '../../style';
import { Row, Cell } from '../table';

export default function ReportTableHeader({
  scrollWidth,
  groupBy,
  interval,
  balanceType,
  style,
  cellStyle,
  compact,
}) {
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
          minWidth: compact ? 80 : 125,
          ...cellStyle,
        }}
        value={groupBy}
        width="flex"
      />
      {interval
        ? interval.map(header => {
            return (
              <Cell
                style={{
                  minWidth: compact ? 50 : 85,
                  ...cellStyle,
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
                  minWidth: compact ? 50 : 85,
                  ...cellStyle,
                }}
                value={'Assets'}
                width="flex"
              />
              <Cell
                style={{
                  minWidth: compact ? 50 : 85,
                  ...cellStyle,
                }}
                value={'Debts'}
                width="flex"
              />
            </>
          )}
      <Cell
        style={{
          minWidth: compact ? 50 : 85,
          ...cellStyle,
        }}
        value={'Totals'}
        width="flex"
      />
      <Cell
        style={{
          minWidth: compact ? 50 : 85,
          ...cellStyle,
        }}
        value={'Average'}
        width="flex"
      />
      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}
