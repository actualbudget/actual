import React, { type ComponentProps, type ReactNode } from 'react';

import { type CSSProperties } from 'glamor';

import { styles } from '../../style';
import Text from '../common/Text';

import format from './format';
import SheetValue from './SheetValue';

type CellValueProps = {
  binding: ComponentProps<typeof SheetValue>['binding'];
  type?: string;
  formatter?: (value) => ReactNode;
  style?: CSSProperties;
  getStyle?: (value) => CSSProperties;
};

function CellValue({
  binding,
  type,
  formatter,
  style,
  getStyle,
}: CellValueProps) {
  return (
    <SheetValue binding={binding}>
      {({ name, value }) => {
        return (
          <Text
            style={[
              type === 'financial' && styles.tnum,
              style,
              getStyle && getStyle(value),
            ]}
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
