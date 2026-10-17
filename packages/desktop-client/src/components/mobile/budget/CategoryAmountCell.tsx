import { makeAmountGrey } from '#components/budget/util';
import { CellValue } from '#components/spreadsheet/CellValue';
import type { Binding } from '#spreadsheet';

import { AMOUNT_TEXT_STYLE } from './budgetTableStyles';
import { CategoryAmountText } from './CategoryAmountText';

type CategoryAmountCellProps = {
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'budget' | 'sum-amount'
  >;
  getAriaLabel: (formattedValue: string) => string;
};

export function CategoryAmountCell({
  binding,
  getAriaLabel,
}: CategoryAmountCellProps) {
  return (
    <CellValue<'envelope-budget' | 'tracking-budget', 'budget' | 'sum-amount'>
      binding={binding}
      type="financial"
    >
      {({ value }) => (
        <CategoryAmountText
          value={value}
          getAriaLabel={getAriaLabel}
          style={{ ...AMOUNT_TEXT_STYLE, ...makeAmountGrey(value) }}
        />
      )}
    </CellValue>
  );
}
