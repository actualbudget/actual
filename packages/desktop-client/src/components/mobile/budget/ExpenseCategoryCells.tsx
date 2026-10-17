import { useTranslation } from 'react-i18next';

import type { CategoryEntity } from '@actual-app/core/types/models';

import { useBudgetBindings } from '#hooks/useBudgetBindings';

import { BalanceCell } from './BalanceCell';
import { CategoryAmountCell } from './CategoryAmountCell';
import { CategoryBudgetedCell } from './CategoryBudgetedCell';

type ExpenseCategoryCellsProps = {
  category: CategoryEntity;
  month: string;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  wasRecentLongPress: () => boolean;
};

export function ExpenseCategoryCells({
  category,
  month,
  show3Columns,
  showBudgetedColumn,
  wasRecentLongPress,
}: ExpenseCategoryCellsProps) {
  const { t } = useTranslation();
  const bindings = useBudgetBindings();

  return (
    <>
      {(show3Columns || showBudgetedColumn) && (
        <CategoryBudgetedCell
          category={category}
          month={month}
          wasRecentLongPress={wasRecentLongPress}
        />
      )}
      {(show3Columns || !showBudgetedColumn) && (
        <CategoryAmountCell
          binding={bindings.catSumAmount(category.id)}
          getAriaLabel={amount =>
            t('Spent amount for {{categoryName}} category, {{amount}}', {
              categoryName: category.name,
              amount,
            })
          }
        />
      )}
      <BalanceCell
        binding={bindings.catBalance(category.id)}
        category={category}
        getAriaLabel={amount =>
          t('Balance for {{categoryName}} category, {{amount}}', {
            categoryName: category.name,
            amount,
          })
        }
      />
    </>
  );
}
