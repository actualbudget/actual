import { useTranslation } from 'react-i18next';

import type { CategoryEntity } from '@actual-app/core/types/models';

import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { BalanceCell } from './BalanceCell';
import { CategoryAmountCell } from './CategoryAmountCell';

type IncomeCategoryCellsProps = {
  category: CategoryEntity;
};

export function IncomeCategoryCells({ category }: IncomeCategoryCellsProps) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const bindings = useBudgetBindings();

  return (
    <>
      {budgetType === 'tracking' && (
        <CategoryAmountCell
          binding={bindings.catBudgeted(category.id)}
          aria-label={t('Budgeted amount for {{categoryName}} category', {
            categoryName: category.name,
          })}
        />
      )}
      <BalanceCell
        binding={bindings.catSumAmount(category.id)}
        category={category}
        aria-label={t('Received amount for {{categoryName}} category', {
          categoryName: category.name,
        })}
      />
    </>
  );
}
