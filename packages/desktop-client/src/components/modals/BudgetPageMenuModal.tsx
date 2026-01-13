import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type BudgetPageMenuModalProps = Extract<
  ModalType,
  { name: 'budget-page-menu' }
>['options'];

export function BudgetPageMenuModal({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetFile,
}: BudgetPageMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal name="budget-page-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            showLogo
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <BudgetPageMenu
            getItemStyle={() => defaultMenuItemStyle}
            onAddCategoryGroup={onAddCategoryGroup}
            onToggleHiddenCategories={onToggleHiddenCategories}
            onSwitchBudgetFile={onSwitchBudgetFile}
          />
        </>
      )}
    </Modal>
  );
}

type BudgetPageMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onAddCategoryGroup: () => void;
  onToggleHiddenCategories: () => void;
  onSwitchBudgetFile: () => void;
};

function BudgetPageMenu({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetFile,
  ...props
}: BudgetPageMenuProps) {
  const { t } = useTranslation();
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
  const payPeriodFeatureFlagEnabled = useFeatureFlag('payPeriodsEnabled');
  const [payPeriodViewEnabled, setPayPeriodViewEnabled] =
    useSyncedPref('showPayPeriods');

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'add-category-group':
        onAddCategoryGroup?.();
        break;
      // case 'edit-mode':
      //   onEditMode?.(true);
      //   break;
      case 'toggle-hidden-categories':
        onToggleHiddenCategories?.();
        break;
      case 'toggle-pay-periods':
        setPayPeriodViewEnabled(
          payPeriodViewEnabled === 'true' ? 'false' : 'true',
        );
        break;
      case 'switch-budget-file':
        onSwitchBudgetFile?.();
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
    }
  };

  const menuItems = [
    {
      name: 'add-category-group',
      text: t('Add category group'),
    },
    {
      name: 'toggle-hidden-categories',
      text: `${!showHiddenCategories ? t('Show hidden categories') : t('Hide hidden categories')}`,
    },
  ];

  if (payPeriodFeatureFlagEnabled) {
    menuItems.push({
      name: 'toggle-pay-periods',
      text:
        payPeriodViewEnabled === 'true'
          ? t('Hide pay periods')
          : t('Show pay periods'),
    });
  }

  menuItems.push({
    name: 'switch-budget-file',
    text: t('Switch budget file'),
  });

  return <Menu {...props} onMenuSelect={onMenuSelect} items={menuItems} />;
}
