import React from 'react';

import { reportBudget } from 'loot-core/src/client/queries';

import { type CSSProperties } from '../../../../style';

import { BudgetTotal } from './BudgetTotal';
import { IncomeProgress } from './IncomeProgress';

type IncomeTotalProps = {
  style?: CSSProperties;
};
export function IncomeTotal({ style }: IncomeTotalProps) {
  return (
    <BudgetTotal
      title="Income"
      current={reportBudget.totalIncome}
      target={reportBudget.totalBudgetedIncome}
      ProgressComponent={IncomeProgress}
      style={style}
    />
  );
}
