import React from 'react';
import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { Term } from '#components/common/Term';
import { trackingBudget } from '#spreadsheet/bindings';

import { BudgetTotal } from './BudgetTotal';

type ExpenseTotalProps = {
  style?: CSSProperties;
};
export function ExpenseTotal({ style }: ExpenseTotalProps) {
  return (
    <BudgetTotal
      title={
        <Term id="expenses" isFocusable={false}>
          <Trans>Expenses</Trans>
        </Term>
      }
      kind="expense"
      current={trackingBudget.totalSpent}
      target={trackingBudget.totalBudgetedExpense}
      style={style}
    />
  );
}
