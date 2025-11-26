import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

type CategoryGroupActionMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onApplyBudgetTemplatesInGroup: () => void;
};
export function CategoryGroupActionMenu({
  onApplyBudgetTemplatesInGroup,
  ...props
}: CategoryGroupActionMenuProps) {
  const { t } = useTranslation();

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'apply-budget-templates-in-group':
            onApplyBudgetTemplatesInGroup();
            break;
        }
      }}
      items={[
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'apply-budget-templates-in-group',
                text: t('Overwrite with templates'),
              },
            ]
          : []),
      ]}
    />
  );
}
