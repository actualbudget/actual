import React, { type UIEventHandler } from 'react';
import { type RefProp } from 'react-spring';

import { styles, theme } from '../../style';
import View from '../common/View';
import { Row, Cell } from '../table';

import { type GroupedEntity } from './entities';

type ReportTableHeaderProps = {
  scrollWidth?: number;
  groupBy: string;
  interval?: GroupedEntity[];
  balanceType: string;
  headerScrollRef: RefProp<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
};

function ReportTableHeader({
  scrollWidth,
  groupBy,
  interval,
  balanceType,
  headerScrollRef,
  handleScroll,
}: ReportTableHeaderProps) {
  return (
    <Row
      collapsed={true}
      style={{
        justifyContent: 'center',
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <Cell
        style={{
          width: 150,
          flexShrink: 0,
          ...styles.tnum,
        }}
        value={groupBy}
      />
      {interval ? (
        <View
          innerRef={headerScrollRef}
          onScroll={handleScroll}
          id={'header'}
          style={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '::-webkit-scrollbar': { display: 'none' },
            flexDirection: 'row',
            flex: 1,
            flexShrink: 1,
          }}
        >
          {interval.map((header, index) => {
            return (
              <Cell
                style={{
                  minWidth: 85,
                  ...styles.tnum,
                }}
                key={index}
                value={header.date}
                width="flex"
              />
            );
          })}
        </View>
      ) : (
        <Cell width="flex" />
      )}
      <View
        style={{
          flexDirection: 'row',
          flexShrink: 0,
        }}
      >
        {balanceType === 'Net' && (
          <>
            <Cell
              style={{
                width: 85,
                ...styles.tnum,
              }}
              value={'Deposits'}
            />
            <Cell
              style={{
                width: 85,
                ...styles.tnum,
              }}
              value={'Payments'}
            />
          </>
        )}
        <Cell
          style={{
            width: 85,
            ...styles.tnum,
          }}
          value={'Totals'}
        />
        <Cell
          style={{
            width: 85,
            ...styles.tnum,
          }}
          value={'Average'}
        />
        {scrollWidth > 0 && <Cell width={scrollWidth} />}
      </View>
    </Row>
  );
}

export default ReportTableHeader;
