import React from 'react';

import { type CSSProperties, styles, theme } from '../../style';
import { Row, Cell } from '../table';

import { type GroupedEntity } from './entities';

type TableRowIndexProps = {
  item?: GroupedEntity;
  groupByItem?: string;
  style?: CSSProperties;
};

const TableRowIndex = ({ item, groupByItem, style }: TableRowIndexProps) => {
  return (
    <Row
      collapsed={true}
      style={{
        color: theme.tableText,
        backgroundColor: theme.tableBackground,
        ...style,
      }}
    >
      {item ? (
        <Cell
          value={item[groupByItem]}
          width="flex"
          title={item[groupByItem].length > 12 && item[groupByItem]}
          style={{
            minWidth: 125,
            ...styles.tnum,
          }}
        />
      ) : (
        <Cell />
      )}
    </Row>
  );
};

export default TableRowIndex;
