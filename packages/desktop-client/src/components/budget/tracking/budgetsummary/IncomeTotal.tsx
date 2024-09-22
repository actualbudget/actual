import React from 'react';
import { useTranslation } from 'react-i18next';

import { trackingBudget } from 'loot-core/src/client/queries';

import { type CSSProperties } from '../../../../style';

import { BudgetTotal } from './BudgetTotal';
import { IncomeProgress } from './IncomeProgress';

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
