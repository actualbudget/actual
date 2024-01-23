// @ts-strict-ignore
import React, { type ComponentProps, type ReactNode } from 'react';

import { type CSSProperties, styles } from '../../style';
import { Text } from '../common/Text';
import { ConditionalPrivacyFilter } from '../PrivacyFilter';

import { type FormatType, useFormat } from './useFormat';
import { useSheetName } from './useSheetName';
import { useSheetValue } from './useSheetValue';

import { type Binding } from '.';

type CellValueProps = {
  binding: string | Binding;
  type?: FormatType;
  formatter?: (value) => ReactNode;
  style?: CSSProperties;
  getStyle?: (value) => CSSProperties;
  privacyFilter?: ComponentProps<
    typeof ConditionalPrivacyFilter
  >['privacyFilter'];
  ['data-testid']?: string;
};

export function CellValue({
  binding,
  type,
  formatter,
  style,
  getStyle,
  privacyFilter,
  'data-testid': testId,
  ...props
}: CellValueProps) {
  const { fullSheetName } = useSheetName(binding);
  const sheetValue = useSheetValue(binding);
  const format = useFormat();

  return (
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
        style={{
          ...(type === 'financial' && styles.tnum),
          ...style,
          ...(getStyle && getStyle(sheetValue)),
        }}
        data-testid={testId || fullSheetName}
        data-cellname={fullSheetName}
        {...props}
      >
        {formatter ? formatter(sheetValue) : format(sheetValue, type)}
      </Text>
    </ConditionalPrivacyFilter>
  );
}
