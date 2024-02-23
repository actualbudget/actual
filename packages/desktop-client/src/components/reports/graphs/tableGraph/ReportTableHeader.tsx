// @ts-strict-ignore
import React, { type UIEventHandler } from 'react';
import { type RefProp } from 'react-spring';

import { type DataEntity } from 'loot-core/src/types/models/reports';

import { theme } from '../../../../style';
import { type CSSProperties } from '../../../../style/types';
import { View } from '../../../common/View';
import { Row, Cell } from '../../../table';
import { ReportOptions } from '../../ReportOptions';

type ReportTableHeaderProps = {
  groupBy: string;
  interval?: string;
  data?: DataEntity[];
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
  data,
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
          }}
          valueStyle={compactStyle}
          value={
            groupBy === 'Interval'
              ? ReportOptions.intervalMap.get(interval)
              : groupBy
          }
        />
        {data
          ? data.map((header, index) => {
              return (
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
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
                  }}
                  valueStyle={compactStyle}
                  value="Deposits"
                  width="flex"
                />
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                  value="Payments"
                  width="flex"
                />
              </>
            )}
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          value="Totals"
          width="flex"
        />
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          value="Average"
          width="flex"
        />
      </View>
    </Row>
  );
}
