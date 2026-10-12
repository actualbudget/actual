import { useTranslation } from 'react-i18next';

import type { CategoryEntity } from '@actual-app/core/types/models';

import { useBudgetBindings } from '#hooks/useBudgetBindings';

import { BalanceCell } from './BalanceCell';
import { CategoryAmountCell } from './CategoryAmountCell';

type ExpenseCategoryCellsProps = {
  category: CategoryEntity;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
};

export function ExpenseCategoryCells({
  category,
  show3Columns,
  showBudgetedColumn,
}: ExpenseCategoryCellsProps) {
  const { t } = useTranslation();
  const bindings = useBudgetBindings();

  return (
    <>
      {(show3Columns || showBudgetedColumn) && (
        <CategoryAmountCell
          binding={bindings.catBudgeted(category.id)}
          aria-label={t('Budgeted amount for {{categoryName}} category', {
            categoryName: category.name,
          })}
        />
      )}
      {(show3Columns || !showBudgetedColumn) && (
        <CategoryAmountCell
          binding={bindings.catSumAmount(category.id)}
          aria-label={t('Spent amount for {{categoryName}} category', {
            categoryName: category.name,
          })}
        />
      )}
      <BalanceCell
        binding={bindings.catBalance(category.id)}
        category={category}
        aria-label={t('Balance for {{categoryName}} category', {
          categoryName: category.name,
        })}
      />
    </>
  );
}
