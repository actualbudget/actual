import React from 'react';

import { reportBudget } from 'loot-core/src/client/queries';

import { type CSSProperties } from '../../../../style';

import { BudgetTotal } from './BudgetTotal';
import { ExpenseProgress } from './ExpenseProgress';

type ExpenseTotalProps = {
  style?: CSSProperties;
};
export function ExpenseTotal({ style }: ExpenseTotalProps) {
  return (
    <BudgetTotal
      title="Expenses"
      current={reportBudget.totalSpent}
      target={reportBudget.totalBudgetedExpense}
      ProgressComponent={ExpenseProgress}
      style={style}
    />
  );
}
