import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';
import { Menu } from '../../../common/Menu';

type BudgetMonthMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onCopyLastMonthBudget: () => void;
  onSetBudgetsToZero: () => void;
  onSetMonthsAverage: (numberOfMonths: number) => void;
  onCheckTemplates: () => void;
  onApplyBudgetTemplates: () => void;
  onOverwriteWithBudgetTemplates: () => void;
  onEndOfMonthCleanup: () => void;
};
export function BudgetMonthMenu({
  onCopyLastMonthBudget,
  onSetBudgetsToZero,
  onSetMonthsAverage,
  onCheckTemplates,
  onApplyBudgetTemplates,
  onOverwriteWithBudgetTemplates,
  onEndOfMonthCleanup,
  ...props
}: BudgetMonthMenuProps) {
  const { t } = useTranslation();

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'copy-last':
            onCopyLastMonthBudget();
            break;
          case 'set-zero':
            onSetBudgetsToZero();
            break;
          case 'set-3-avg':
            onSetMonthsAverage(3);
            break;
          case 'check-templates':
            onCheckTemplates();
            break;
          case 'apply-goal-template':
            onApplyBudgetTemplates();
            break;
          case 'overwrite-goal-template':
            onOverwriteWithBudgetTemplates();
            break;
          case 'cleanup-goal-template':
            onEndOfMonthCleanup();
            break;
        }
      }}
      items={[
        { name: 'copy-last', text: t('Copy last month’s budget') },
        { name: 'set-zero', text: t('Set budgets to zero') },
        {
          name: 'set-3-avg',
          text: t('Set budgets to 3 month average'),
        },
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'check-templates',
                text: t('Check templates'),
              },
              {
                name: 'apply-goal-template',
                text: t('Apply budget template'),
              },
              {
                name: 'overwrite-goal-template',
                text: t('Overwrite with budget template'),
              },
              {
                name: 'cleanup-goal-template',
                text: t('End of month cleanup'),
              },
            ]
          : []),
      ]}
    />
  );
}
