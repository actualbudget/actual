import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { trackingBudget } from 'loot-core/client/queries';

import { BudgetTotal } from '@desktop-client/components/budget/tracking/budgetsummary/BudgetTotal';
import { IncomeProgress } from '@desktop-client/components/budget/tracking/budgetsummary/IncomeProgress';

type IncomeTotalProps = {
  style?: CSSProperties;
};
export function IncomeTotal({ style }: IncomeTotalProps) {
  const { t } = useTranslation();
  return (
    <BudgetTotal
      title={t('Income')}
      current={trackingBudget.totalIncome}
      target={trackingBudget.totalBudgetedIncome}
      ProgressComponent={IncomeProgress}
      style={style}
    />
  );
}
