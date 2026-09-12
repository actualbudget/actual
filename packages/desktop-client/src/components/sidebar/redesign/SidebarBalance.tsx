import type { CSSProperties } from '@actual-app/components/styles';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import type { Binding, SheetFields } from '#spreadsheet';

type SidebarBalanceProps<FieldName extends SheetFields<'account'>> = {
  binding: Binding<'account', FieldName>;
  style?: CSSProperties;
  testId?: string;
};

export function SidebarBalance<FieldName extends SheetFields<'account'>>({
  binding,
  style,
  testId,
}: SidebarBalanceProps<FieldName>) {
  return (
    <CellValue<'account', FieldName> binding={binding} type="financial">
      {props => (
        <CellValueText<'account', FieldName>
          {...props}
          data-testid={testId ?? props.name}
          style={{ textAlign: 'right', ...style }}
        />
      )}
    </CellValue>
  );
}
