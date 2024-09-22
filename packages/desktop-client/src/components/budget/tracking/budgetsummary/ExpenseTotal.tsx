import React from 'react';
import { useTranslation } from 'react-i18next';

import { trackingBudget } from 'loot-core/src/client/queries';

import { type CSSProperties } from '../../../../style';

import { BudgetTotal } from './BudgetTotal';
import { ExpenseProgress } from './ExpenseProgress';

type ExpenseTotalProps = {
  style?: CSSProperties;
};
export function ExpenseTotal({ style }: ExpenseTotalProps) {
  const { t } = useTranslation();
  return (
    <BudgetTotal
      title={t('Expenses')}
      current={trackingBudget.totalSpent}
      target={trackingBudget.totalBudgetedExpense}
      ProgressComponent={ExpenseProgress}
      style={style}
    />
  );
}
