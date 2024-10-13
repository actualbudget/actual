// @ts-strict-ignore
import React, { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { type CSSProperties, styles } from '../../style';
import { Text } from '../common/Text';
import { PrivacyFilter } from '../PrivacyFilter';

import { type FormatType, useFormat } from './useFormat';
import { useSheetName } from './useSheetName';
import { useSheetValue } from './useSheetValue';

import {
  type Binding,
  type SheetNames,
  type SheetFields,
  type Spreadsheets,
} from '.';

type CellValueProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = {
  children?: ({
    type,
    name,
    value,
  }: {
    type?: FormatType;
    name: string;
    value: Spreadsheets[SheetName][FieldName];
  }) => ReactNode;
  binding: Binding<SheetName, FieldName>;
  type?: FormatType;
  currency?: string;
};

export function CellValue<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({ type, binding, currency, children, ...props }: CellValueProps<SheetName, FieldName>) {
  const { fullSheetName } = useSheetName(binding);
  const sheetValue = useSheetValue(binding);

  return children ? (
    <>{children({ type, name: fullSheetName, value: sheetValue })}</>
  ) : (
    <CellValueText
      type={type}
      name={fullSheetName}
      value={sheetValue}
      currency={currency}
      {...props}
    />
  );
}

const PRIVACY_FILTER_TYPES = ['financial', 'financial-with-sign'];

type CellValueTextProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = Omit<ComponentPropsWithoutRef<typeof Text>, 'value'> & {
  type?: FormatType;
  name: string;
  value: Spreadsheets[SheetName][FieldName];
  currency?: string;
  style?: CSSProperties;
  formatter?: (
    value: Spreadsheets[SheetName][FieldName],
    type?: FormatType,
    currency?: string,
  ) => string;
};

export function CellValueText<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  type,
  name,
  value,
  currency,
  formatter,
  style,
  ...props
}: CellValueTextProps<SheetName, FieldName>) {
  const format = useFormat();

  return (
    <Text
      style={{
        textWrap: 'nowrap',
        ...(type === 'financial' && styles.tnum),
        ...style,
      }}
      data-testid={name}
      data-cellname={name}
      {...props}
    >
      <PrivacyFilter activationFilters={[PRIVACY_FILTER_TYPES.includes(type)]}>
        {formatter ? formatter(value, type, currency) : format(value, type, currency)}
      </PrivacyFilter>
    </Text>
  );
}
