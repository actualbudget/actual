// @ts-strict-ignore
import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { Text } from '@actual-app/components/text';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat, type FormatType } from '@desktop-client/hooks/useFormat';
import { useSheetName } from '@desktop-client/hooks/useSheetName';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import {
  type Binding,
  type SheetFields,
  type SheetNames,
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
    currencyCode,
  }: {
    type?: FormatType;
    name: string;
    value: Spreadsheets[SheetName][FieldName];
    currencyCode?: string | null;
  }) => ReactNode;
  binding: Binding<SheetName, FieldName>;
  type?: FormatType;
  /**
   * Optional currency code to use for formatting financial values.
   * If not provided, uses the default currency from preferences.
   * Useful for displaying account balances in their specific currency.
   * @example currencyCode="EUR" or currencyCode={account.currency_code}
   */
  currencyCode?: string | null;
};

export function CellValue<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  type,
  binding,
  children,
  currencyCode,
  ...props
}: CellValueProps<SheetName, FieldName>) {
  const { fullSheetName } = useSheetName(binding);
  const sheetValue = useSheetValue(binding);

  return typeof children === 'function' ? (
    <>
      {children({ type, name: fullSheetName, value: sheetValue, currencyCode })}
    </>
  ) : (
    <CellValueText
      type={type}
      name={fullSheetName}
      value={sheetValue}
      currencyCode={currencyCode}
      {...props}
    />
  );
}

const PRIVACY_FILTER_TYPES = ['financial', 'financial-with-sign'];

type CellValueTextProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = Omit<ComponentPropsWithoutRef<typeof Text>, 'value' | 'as'> & {
  type?: FormatType;
  name: string;
  value: Spreadsheets[SheetName][FieldName];
  style?: CSSProperties;
  /**
   * Optional custom formatter function.
   * If provided, this will be used instead of the default format function.
   * The third parameter (currencyCode) allows the formatter to be currency-aware.
   */
  formatter?: (
    value: Spreadsheets[SheetName][FieldName],
    type?: FormatType,
    currencyCode?: string | null,
  ) => string;
  /**
   * Optional currency code to use for formatting financial values.
   * If not provided, uses the default currency from preferences.
   * Useful for displaying account balances in their specific currency.
   * @example currencyCode="EUR" or currencyCode={account.currency_code}
   */
  currencyCode?: string | null;
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
  currencyCode,
  ...props
}: CellValueTextProps<SheetName, FieldName>) {
  const format = useFormat();
  const isFinancial =
    type === 'financial' ||
    type === 'financial-with-sign' ||
    type === 'financial-no-decimals';
  const sharedProps = {
    style,
    'data-testid': name,
    'data-cellname': name,
    ...props,
  };

  if (isFinancial) {
    return (
      <FinancialText
        {...sharedProps}
        style={{
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <PrivacyFilter
          activationFilters={[PRIVACY_FILTER_TYPES.includes(type)]}
        >
          {formatter ? formatter(value, type) : format(value, type)}
        </PrivacyFilter>
      </FinancialText>
    );
  }

  return (
    <Text {...sharedProps}>
      <PrivacyFilter activationFilters={[PRIVACY_FILTER_TYPES.includes(type)]}>
        {formatter
          ? formatter(value, type, currencyCode)
          : format(value, type, currencyCode)}
      </PrivacyFilter>
    </Text>
  );
}
