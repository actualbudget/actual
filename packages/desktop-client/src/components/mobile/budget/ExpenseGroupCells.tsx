import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { makeAmountFullStyle } from '#components/budget/util';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useBudgetBindings } from '#hooks/useBudgetBindings';

import { CategoryAmountText } from './CategoryAmountText';

const GROUP_AMOUNT_STYLE: CSSProperties = {
  ...styles.tnum,
  ...styles.verySmallText,
  color: theme.pageTextLight,
  textAlign: 'right',
};

type ExpenseGroupCellsProps = {
  group: CategoryGroupEntity;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
};

export function ExpenseGroupCells({
  group,
  show3Columns,
  showBudgetedColumn,
}: ExpenseGroupCellsProps) {
  const bindings = useBudgetBindings();

  return (
    <>
      {(show3Columns || showBudgetedColumn) && (
        <CellValue<'envelope-budget' | 'tracking-budget', 'group-budget'>
          binding={bindings.groupBudgeted(group.id)}
          type="financial"
        >
          {({ value }) => (
            <CategoryAmountText value={value} style={GROUP_AMOUNT_STYLE} />
          )}
        </CellValue>
      )}
      {(show3Columns || !showBudgetedColumn) && (
        <CellValue<'envelope-budget' | 'tracking-budget', 'group-sum-amount'>
          binding={bindings.groupSumAmount(group.id)}
          type="financial"
        >
          {({ value }) => (
            <CategoryAmountText value={value} style={GROUP_AMOUNT_STYLE} />
          )}
        </CellValue>
      )}
      <CellValue<'envelope-budget' | 'tracking-budget', 'group-leftover'>
        binding={bindings.groupBalance(group.id)}
        type="financial"
      >
        {({ value }) => (
          <CategoryAmountText
            value={value}
            style={{
              ...GROUP_AMOUNT_STYLE,
              fontWeight: 700,
              ...makeAmountFullStyle(value),
            }}
          />
        )}
      </CellValue>
    </>
  );
}
