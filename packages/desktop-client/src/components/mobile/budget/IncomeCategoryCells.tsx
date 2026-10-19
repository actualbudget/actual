import { useTranslation } from 'react-i18next';

import type { CategoryEntity } from '@actual-app/core/types/models';

import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { BalanceCell } from './BalanceCell';
import { CategoryBudgetedCell } from './CategoryBudgetedCell';

type IncomeCategoryCellsProps = {
  category: CategoryEntity;
  month: string;
  wasRecentLongPress: () => boolean;
};

export function IncomeCategoryCells({
  category,
  month,
  wasRecentLongPress,
}: IncomeCategoryCellsProps) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const bindings = useBudgetBindings();

  return (
    <>
      {budgetType === 'tracking' && (
        <CategoryBudgetedCell
          category={category}
          month={month}
          wasRecentLongPress={wasRecentLongPress}
        />
      )}
      <BalanceCell
        binding={bindings.catSumAmount(category.id)}
        category={category}
        getAriaLabel={(amount, isCarryover) =>
          isCarryover
            ? t(
                'Received amount for {{categoryName}} category, {{amount}}, rolls over to next month',
                { categoryName: category.name, amount },
              )
            : t('Received amount for {{categoryName}} category, {{amount}}', {
                categoryName: category.name,
                amount,
              })
        }
      />
    </>
  );
}
