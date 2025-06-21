// @ts-strict-ignore
import React, {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { type FormatType, useFormat } from '@desktop-client/hooks/useFormat';
import { useSheetName } from '@desktop-client/hooks/useSheetName';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import {
  type Binding,
  type SheetNames,
  type SheetFields,
  type Spreadsheets,
} from '@desktop-client/spreadsheet';

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

  return typeof children === 'function' ? (
    <>{children({ type, name: fullSheetName, value: sheetValue })}</>
  ) : (
    <CellValueText
      type={type}
      name={fullSheetName}
      value={sheetValue}
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
  style?: CSSProperties;
  formatter?: (
    value: Spreadsheets[SheetName][FieldName],
    type?: FormatType,
  ) => string;
};

export function CellValueText<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  type,
  name,
  value,
  formatter,
  style,
  ...props
}: CellValueTextProps<SheetName, FieldName>) {
  const format = useFormat();
  const isFinancial =
    type === 'financial' ||
    type === 'financial-with-sign' ||
    type === 'financial-no-decimals';
  return (
    <Text
      style={{
        ...(isFinancial && styles.tnum),
        ...(isFinancial && { whiteSpace: 'nowrap' }),
        ...style,
      }}
      data-testid={name}
      data-cellname={name}
      {...props}
    >
      <PrivacyFilter activationFilters={[PRIVACY_FILTER_TYPES.includes(type)]}>
        {formatter ? formatter(value, type) : format(value, type)}
      </PrivacyFilter>
    </Text>
  );
}
