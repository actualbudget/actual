import React, { type ReactNode, useMemo } from 'react';

import { type CSSProperties } from 'glamor';

import { styles } from '../../style';
import Text from '../common/Text';
import {
  ConditionalPrivacyFilter,
  type ConditionalPrivacyFilterProps,
} from '../PrivacyFilter';

import format from './format';
import useSheetName from './useSheetName';
import useSheetValue from './useSheetValue';

type Binding = { name: string; value; query?: unknown };

type CellValueProps = {
  binding: string | Binding;
  type?: string;
  formatter?: (value) => ReactNode;
  style?: CSSProperties;
  getStyle?: (value) => CSSProperties;
  privacyFilter?: ConditionalPrivacyFilterProps['privacyFilter'];
};

function CellValue({
  binding,
  type,
  formatter,
  style,
  getStyle,
  privacyFilter,
}: CellValueProps) {
  let { fullSheetName } = useSheetName(binding);
  let sheetValue = useSheetValue(binding);

  return useMemo(
    () => (
      <ConditionalPrivacyFilter privacyFilter={privacyFilter}>
        <Text
          style={[
            type === 'financial' && styles.tnum,
            style,
            getStyle && getStyle(sheetValue),
          ]}
          data-testid={fullSheetName}
          data-cellname={fullSheetName}
        >
          {formatter ? formatter(sheetValue) : format(sheetValue, type)}
        </Text>
      </ConditionalPrivacyFilter>
    ),
    [
      privacyFilter,
      type,
      style,
      getStyle,
      fullSheetName,
      formatter,
      sheetValue,
    ],
  );
}

export default CellValue;
