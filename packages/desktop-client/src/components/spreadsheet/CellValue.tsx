import React, { type ReactNode, useMemo } from 'react';

import { type CSSProperties } from 'glamor';

import { styles } from '../../style';
import Text from '../common/Text';
import {
  ConditionalPrivacyFilter,
  type ConditionalPrivacyFilterProps,
} from '../PrivacyFilter';

import { useFormat } from './format';
import useSheetName from './useSheetName';
import useSheetValue from './useSheetValue';

import { type Binding } from '.';

type CellValueProps = {
  binding: string | Binding;
  type?: string;
  formatter?: (value) => ReactNode;
  style?: CSSProperties;
  getStyle?: (value) => CSSProperties;
  privacyFilter?: ConditionalPrivacyFilterProps['privacyFilter'];
  ['data-testid']?: string;
};

function CellValue({
  binding,
  type,
  formatter,
  style,
  getStyle,
  privacyFilter,
  'data-testid': testId,
}: CellValueProps) {
  let { fullSheetName } = useSheetName(binding);
  let sheetValue = useSheetValue(binding);
  let format = useFormat();

  return useMemo(
    () => (
      <ConditionalPrivacyFilter
        privacyFilter={
          privacyFilter != null
            ? privacyFilter
            : type === 'financial'
            ? true
            : undefined
        }
      >
        <Text
          style={[
            type === 'financial' && styles.tnum,
            style,
            getStyle && getStyle(sheetValue),
          ]}
          data-testid={testId || fullSheetName}
          data-cellname={fullSheetName}
          data-vrt-mask
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
      format,
      sheetValue,
    ],
  );
}

export default CellValue;
