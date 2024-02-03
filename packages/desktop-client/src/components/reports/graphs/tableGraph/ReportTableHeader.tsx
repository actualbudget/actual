// @ts-strict-ignore
import React, { type UIEventHandler } from 'react';
import { type RefProp } from 'react-spring';

import { type DataEntity } from 'loot-core/src/types/models/reports';

import { styles, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row, Cell } from '../../../table';

type ReportTableHeaderProps = {
  groupBy: string;
  interval?: DataEntity[];
  balanceType: string;
  headerScrollRef: RefProp<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  compact: boolean;
};

export function ReportTableHeader({
  groupBy,
  interval,
  balanceType,
  headerScrollRef,
  handleScroll,
  compact,
}: ReportTableHeaderProps) {
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
            width: 120,
            flexShrink: 0,
            ...styles.tnum,
          }}
          value={groupBy}
        />
        {interval
          ? interval.map((header, index) => {
              return (
                <Cell
                  style={{
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
                  key={index}
                  value={header.date}
                  width="flex"
                />
              );
            })
          : balanceType === 'Net' && (
              <>
                <Cell
                  style={{
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
                  value="Deposits"
                  width="flex"
                />
                <Cell
                  style={{
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
                  value="Payments"
                  width="flex"
                />
              </>
            )}
        <Cell
          style={{
            minWidth: compact ? 80 : 125,
            ...styles.tnum,
          }}
          value="Totals"
          width="flex"
        />
        <Cell
          style={{
            minWidth: compact ? 80 : 125,
            ...styles.tnum,
          }}
          value="Average"
          width="flex"
        />
      </View>
    </Row>
  );
}
