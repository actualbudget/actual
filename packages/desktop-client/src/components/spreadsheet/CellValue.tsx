// @ts-strict-ignore
import React, {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type CSSProperties,
  Fragment,
} from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';

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
};

export function CellValue<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({ type, binding, children, ...props }: CellValueProps<SheetName, FieldName>) {
  const { fullSheetName } = useSheetName(binding);
  const sheetValue = useSheetValue(binding);

  // Re-render when these value changes.
  const key = `${fullSheetName}|${sheetValue}`;
  return typeof children === 'function' ? (
    <Fragment key={key}>
      {children({ type, name: fullSheetName, value: sheetValue })}
    </Fragment>
  ) : (
    <CellValueText
      key={key}
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
  return (
    <Text
      style={{
        ...(type === 'financial' && styles.tnum),
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
