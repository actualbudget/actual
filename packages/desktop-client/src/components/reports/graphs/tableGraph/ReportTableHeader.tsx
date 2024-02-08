// @ts-strict-ignore
import React, { type UIEventHandler } from 'react';
import { type RefProp } from 'react-spring';

import { type DataEntity } from 'loot-core/src/types/models/reports';

import { theme } from '../../../../style';
import { type CSSProperties } from '../../../../style/types';
import { View } from '../../../common/View';
import { Row, Cell } from '../../../table';

type ReportTableHeaderProps = {
  groupBy: string;
  interval?: DataEntity[];
  balanceType: string;
  headerScrollRef: RefProp<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
};

export function ReportTableHeader({
  groupBy,
  interval,
  balanceType,
  headerScrollRef,
  handleScroll,
  compact,
  style,
  compactStyle,
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
        ...style,
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
            width: compact ? 80 : 125,
            flexShrink: 0,
            ...compactStyle,
          }}
          value={groupBy}
        />
        {interval
          ? interval.map((header, index) => {
              return (
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                    ...compactStyle,
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
                    minWidth: compact ? 50 : 85,
                    ...compactStyle,
                  }}
                  value="Deposits"
                  width="flex"
                />
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                    ...compactStyle,
                  }}
                  value="Payments"
                  width="flex"
                />
              </>
            )}
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
            ...compactStyle,
          }}
          value="Totals"
          width="flex"
        />
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
            ...compactStyle,
          }}
          value="Average"
          width="flex"
        />
      </View>
    </Row>
  );
}
