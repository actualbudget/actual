import React from 'react';
import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { Term } from '#components/common/Term';
import { trackingBudget } from '#spreadsheet/bindings';

import { BudgetTotal } from './BudgetTotal';

type IncomeTotalProps = {
  style?: CSSProperties;
};
export function IncomeTotal({ style }: IncomeTotalProps) {
  return (
    <BudgetTotal
      title={
        <Term id="income" isFocusable={false}>
          <Trans>Income</Trans>
        </Term>
      }
      kind="income"
      current={trackingBudget.totalIncome}
      target={trackingBudget.totalBudgetedIncome}
      style={style}
    />
  );
}
