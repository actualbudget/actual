import React from 'react';

import format from './format';
import SheetValue from './SheetValue';
import Text from '../Text';
import { styles } from '../../style';

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
