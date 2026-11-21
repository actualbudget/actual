import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { AccountEntity } from '@actual-app/core/types/models';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useConvertedAccountsTotal } from '#hooks/useConvertedAccountsTotal';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { useSheetName } from '#hooks/useSheetName';
import type {
  Binding,
  SheetFields,
  SheetNames,
  Spreadsheets,
} from '#spreadsheet';

type ConvertedCellValueProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = {
  // The existing total of `accounts`, used as is when no conversion is
  // needed
  binding: Binding<SheetName, FieldName>;
  accounts: ReadonlyArray<Pick<AccountEntity, 'id' | 'currency'>>;
  type?: FormatType;
  // Receives the same props as a `CellValue` child. Converted totals that
  // count some accounts 1:1 also pass a `formatter` that marks the value as
  // approximate and a `title` explaining why; spread them into
  // `CellValueText` to show them.
  children?: (props: {
    type?: FormatType;
    name: string;
    value: Spreadsheets[SheetName][FieldName];
    formatter?: (
      value: Spreadsheets[SheetName][FieldName],
      type?: FormatType,
    ) => string;
    title?: string;
  }) => ReactNode;
};

// A total across accounts. Accounts in another currency are converted into
// the budget's default currency first; when there are none, this is exactly
// the regular `CellValue` of the binding.
export function ConvertedCellValue<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>(props: ConvertedCellValueProps<SheetName, FieldName>) {
  const { isEnabled, defaultCurrencyCode, getAccountCurrency } =
    useMultiCurrency();
  const needsConversion =
    isEnabled &&
    props.accounts.some(
      account => getAccountCurrency(account) !== defaultCurrencyCode,
    );

  if (!needsConversion) {
    return (
      <CellValue<SheetName, FieldName>
        binding={props.binding}
        type={props.type}
      >
        {props.children}
      </CellValue>
    );
  }
  return <ConvertedTotal {...props} />;
}

// Marks totals that count some accounts 1:1 because they have no rate
export function useApproximateTotal(
  withoutRate: ReadonlyArray<{ currency: string }>,
) {
  const { t } = useTranslation();
  const format = useFormat();
  const currencies = [...new Set(withoutRate.map(entry => entry.currency))];

  if (currencies.length === 0) {
    return { formatter: undefined, title: undefined };
  }
  return {
    formatter: (value: unknown, type?: FormatType) =>
      '≈' + format(value, type ?? 'financial'),
    title: t(
      'Approximate: {{currencies}} counted 1:1 because there is no exchange rate yet',
      { currencies: currencies.join(', ') },
    ),
  };
}

function ConvertedTotal<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  binding,
  accounts,
  type,
  children,
}: ConvertedCellValueProps<SheetName, FieldName>) {
  const { fullSheetName } = useSheetName(binding);
  const converted = useConvertedAccountsTotal(accounts);
  const { formatter, title } = useApproximateTotal(
    converted?.withoutRate ?? [],
  );
  // Totals are numbers, or null while loading like any cell value; the
  // sheet value type also covers other cells
  const total = converted?.total ?? null;
  const value = total as Spreadsheets[SheetName][FieldName];

  if (typeof children === 'function') {
    return (
      <>{children({ type, name: fullSheetName, value, formatter, title })}</>
    );
  }

  return (
    <CellValueText<SheetName, FieldName>
      type={type}
      name={fullSheetName}
      value={value}
      formatter={formatter}
      title={title}
    />
  );
}
