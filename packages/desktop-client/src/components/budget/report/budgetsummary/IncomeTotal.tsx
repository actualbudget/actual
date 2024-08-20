import React from 'react';
import { useTranslation } from 'react-i18next';

import { reportBudget } from 'loot-core/src/client/queries';

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
      current={reportBudget.totalIncome}
      target={reportBudget.totalBudgetedIncome}
      ProgressComponent={IncomeProgress}
      style={style}
    />
  );
}
