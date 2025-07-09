import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { BudgetTotal } from './BudgetTotal';
import { IncomeProgress } from './IncomeProgress';

import { trackingBudget } from '@desktop-client/spreadsheet/bindings';

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
