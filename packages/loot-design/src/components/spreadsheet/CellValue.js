import React from 'react';

import { styles } from '../../style';
import Text from '../Text';

import format from './format';
import SheetValue from './SheetValue';

function CellValue({ binding, type, formatter, style, getStyle, debug }) {
  return (
    <SheetValue binding={binding} debug={debug}>
      {({ name, value }) => {
        return (
          <Text
            style={[
              type === 'financial' && styles.tnum,
              style,
              getStyle && getStyle(value)
            ]}
            numberOfLines={1}
            data-testid={name}
            data-cellname={name}
          >
            {formatter ? formatter(value) : format(value, type)}
          </Text>
        );
      }}
    </SheetValue>
  );
}

export default CellValue;
