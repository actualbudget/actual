import React, { useContext, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { FilteredCategoriesContext } from '#components/budget/FilteredCategoriesContext';
import { useCategorySum } from '#hooks/useCategorySum';
import { useFocusedViews } from '#hooks/useFocusedViews';
import { useSheetName } from '#hooks/useSheetName';
import { trackingBudget } from '#spreadsheet/bindings';

import { BudgetTotal } from './BudgetTotal';
import { ExpenseProgress } from './ExpenseProgress';

type ExpenseTotalProps = {
  style?: CSSProperties;
};
export function ExpenseTotal({ style }: ExpenseTotalProps) {
  const { t } = useTranslation();

  const filteredCategoryGroups = useContext(FilteredCategoriesContext);
  const { activeViewId } = useFocusedViews();
  const { sheetName } = useSheetName<'tracking-budget', 'total-spent'>(
    trackingBudget.totalSpent,
  );

  const expenseCategoryIds = useMemo(() => {
    if (!filteredCategoryGroups) return [];
    return filteredCategoryGroups
      .filter(g => !g.is_income)
      .flatMap(g => g.categories?.map(c => c.id) || []);
  }, [filteredCategoryGroups]);

  const spentSum = useCategorySum(
    sheetName,
    expenseCategoryIds,
    trackingBudget.catSumAmount,
    activeViewId !== null,
  );

  const budgetedSum = useCategorySum(
    sheetName,
    expenseCategoryIds,
    trackingBudget.catBudgeted,
    activeViewId !== null,
  );

  return (
    <BudgetTotal
      title={t('Expenses')}
      current={activeViewId !== null ? spentSum : trackingBudget.totalSpent}
      target={
        activeViewId !== null
          ? budgetedSum
          : trackingBudget.totalBudgetedExpense
      }
      ProgressComponent={ExpenseProgress}
      style={style}
    />
  );
}
