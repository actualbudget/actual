import React, { type ComponentPropsWithoutRef } from 'react';

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
};

export function BudgetMonthMenu({
  onCopyLastMonthBudget,
  onSetBudgetsToZero,
  onSetMonthsAverage,
  onCheckTemplates,
  onApplyBudgetTemplates,
  onOverwriteWithBudgetTemplates,
  ...props
}: BudgetMonthMenuProps) {
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
        }
      }}
      items={[
        { name: 'copy-last', text: 'Copy last month’s budget' },
        { name: 'set-zero', text: 'Set budgets to zero' },
        {
          name: 'set-3-avg',
          text: 'Set budgets to 3 month average',
        },
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'check-templates',
                text: 'Check templates',
              },
              {
                name: 'apply-goal-template',
                text: 'Apply budget template',
              },
              {
                name: 'overwrite-goal-template',
                text: 'Overwrite with budget template',
              },
            ]
          : []),
      ]}
    />
  );
}
