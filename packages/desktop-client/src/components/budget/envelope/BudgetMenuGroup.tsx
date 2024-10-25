import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { Menu } from '../../common/Menu';

type BudgetMenuGroupProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onApplyGroupTemplate: () => void;
};
export function BudgetMenuGroup({
  onApplyGroupTemplate,
  ...props
}: BudgetMenuGroupProps) {
  const { t } = useTranslation();

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'apply-group-category-template':
        onApplyGroupTemplate?.();
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
    }
  };

  return (
    <Menu
      {...props}
      onMenuSelect={onMenuSelect}
      items={[
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'apply-group-category-template',
                text: t('Apply budget template'),
              },
            ]
          : []),
      ]}
    />
  );
}
