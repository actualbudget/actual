import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { trackingBudget } from '../../../../queries/queries';

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
