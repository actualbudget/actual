// @ts-strict-ignore
import React, { type ReactNode } from 'react';

import { type CSSProperties, styles } from '../../style';
import { Text } from '../common/Text';

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
};

export function CellValue<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({ type, binding, children, ...props }: CellValueProps<SheetName, FieldName>) {
  const { fullSheetName } = useSheetName(binding);
  const sheetValue = useSheetValue(binding);

  return children ? (
    <>{children({ type, name: fullSheetName, value: sheetValue })}</>
  ) : (
    <DefaultCellValueText
      type={type}
      name={fullSheetName}
      value={sheetValue}
      {...props}
    />
  );
}

type DefaultCellValueTextProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = {
  type?: FormatType;
  name: string;
  value: Spreadsheets[SheetName][FieldName];
  getStyle?: (value: Spreadsheets[SheetName][FieldName]) => CSSProperties;
  formatter?: (
    value: Spreadsheets[SheetName][FieldName],
    type?: FormatType,
  ) => string;
};

export function DefaultCellValueText<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  type,
  name,
  value,
  formatter,
  getStyle,
  ...props
}: DefaultCellValueTextProps<SheetName, FieldName>) {
  const format = useFormat();
  return (
    <Text
      style={{
        ...(type === 'financial' && styles.tnum),
        ...getStyle?.(value),
      }}
      data-testid={name}
      data-cellname={name}
      {...props}
    >
      {formatter ? formatter(value, type) : format(value, type)}
    </Text>
  );
}
