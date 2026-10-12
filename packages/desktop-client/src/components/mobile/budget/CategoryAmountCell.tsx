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
  'aria-label': string;
};

export function CategoryAmountCell({
  binding,
  'aria-label': ariaLabel,
}: CategoryAmountCellProps) {
  return (
    <CellValue<'envelope-budget' | 'tracking-budget', 'budget' | 'sum-amount'>
      binding={binding}
      type="financial"
    >
      {({ value }) => (
        <CategoryAmountText
          value={value}
          aria-label={ariaLabel}
          style={{ ...AMOUNT_TEXT_STYLE, ...makeAmountGrey(value) }}
        />
      )}
    </CellValue>
  );
}
