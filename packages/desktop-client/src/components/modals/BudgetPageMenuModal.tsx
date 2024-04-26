import React, { type ComponentPropsWithoutRef } from 'react';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useLocalPref } from '../../hooks/useLocalPref';
import { type CSSProperties, theme, styles } from '../../style';
import { Menu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

type BudgetPageMenuModalProps = ComponentPropsWithoutRef<
  typeof BudgetPageMenu
> & {
  modalProps: CommonModalProps;
};

export function BudgetPageMenuModal({
  modalProps,
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetType,
}: BudgetPageMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal showHeader focusAfterClose={false} {...modalProps}>
      <BudgetPageMenu
        getItemStyle={() => defaultMenuItemStyle}
        onAddCategoryGroup={onAddCategoryGroup}
        onToggleHiddenCategories={onToggleHiddenCategories}
        onSwitchBudgetType={onSwitchBudgetType}
      />
    </Modal>
  );
}

type BudgetPageMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onAddCategoryGroup: () => void;
  onToggleHiddenCategories: () => void;
  onSwitchBudgetType: () => void;
};

function BudgetPageMenu({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetType,
  ...props
}: BudgetPageMenuProps) {
  const isReportBudgetEnabled = useFeatureFlag('reportBudget');
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'add-category-group':
        onAddCategoryGroup?.();
        break;
      case 'toggle-hidden-categories':
        onToggleHiddenCategories?.();
        break;
      case 'switch-budget-type':
        onSwitchBudgetType?.();
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
        {
          name: 'add-category-group',
          text: 'Add category group',
        },
        {
          name: 'toggle-hidden-categories',
          text: `${!showHiddenCategories ? 'Show' : 'Hide'} hidden categories`,
        },
        ...(isReportBudgetEnabled
          ? [
              {
                name: 'switch-budget-type',
                text: 'Switch budget type',
              },
            ]
          : []),
      ]}
    />
  );
}
