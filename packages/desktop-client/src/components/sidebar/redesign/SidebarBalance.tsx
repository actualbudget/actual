import type { CSSProperties } from '@actual-app/components/styles';
import type { AccountEntity } from '@actual-app/core/types/models';

import { ConvertedCellValue } from '#components/currency/ConvertedCellValue';
import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useCurrencyFormatter } from '#hooks/useCurrencyFormatter';
import type { Binding, SheetFields } from '#spreadsheet';

type SidebarBalanceProps<FieldName extends SheetFields<'account'>> = {
  binding: Binding<'account', FieldName>;
  // Shows the balance in this account's own currency
  account?: Pick<AccountEntity, 'id' | 'currency'>;
  // For totals: the accounts that `binding` adds up, so balances in other
  // currencies can be converted first
  totalAccounts?: ReadonlyArray<Pick<AccountEntity, 'id' | 'currency'>>;
  style?: CSSProperties;
  testId?: string;
};

export function SidebarBalance<FieldName extends SheetFields<'account'>>({
  binding,
  account,
  totalAccounts,
  style,
  testId,
}: SidebarBalanceProps<FieldName>) {
  const { formatAmount, getAccountCurrency } = useCurrencyFormatter();

  if (totalAccounts) {
    return (
      <ConvertedCellValue<'account', FieldName>
        binding={binding}
        accounts={totalAccounts}
        type="financial"
      >
        {props => (
          <CellValueText<'account', FieldName>
            {...props}
            data-testid={testId ?? props.name}
            style={{ textAlign: 'right', ...style }}
          />
        )}
      </ConvertedCellValue>
    );
  }

  return (
    <CellValue<'account', FieldName> binding={binding} type="financial">
      {props => (
        <CellValueText<'account', FieldName>
          {...props}
          formatter={
            account
              ? value =>
                  formatAmount(Number(value ?? 0), getAccountCurrency(account))
              : undefined
          }
          data-testid={testId ?? props.name}
          style={{ textAlign: 'right', ...style }}
        />
      )}
    </CellValue>
  );
}
