import React from 'react';
import { useTranslation } from 'react-i18next';

import { reportBudget } from 'loot-core/src/client/queries';

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
      current={reportBudget.totalSpent}
      target={reportBudget.totalBudgetedExpense}
      ProgressComponent={ExpenseProgress}
      style={style}
    />
  );
}
