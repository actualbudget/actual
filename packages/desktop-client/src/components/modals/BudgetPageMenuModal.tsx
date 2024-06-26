import React, { type ComponentPropsWithoutRef } from 'react';

import { useLocalPref } from '../../hooks/useLocalPref';
import { type CSSProperties, theme, styles } from '../../style';
import { Menu } from '../common/Menu';
import { Modal, ModalHeader } from '../common/Modal2';
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
  onSwitchBudgetFile,
}: BudgetPageMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal
      header={props => <ModalHeader {...props} showLogo />}
      {...modalProps}
    >
      <BudgetPageMenu
        getItemStyle={() => defaultMenuItemStyle}
        onAddCategoryGroup={onAddCategoryGroup}
        onToggleHiddenCategories={onToggleHiddenCategories}
        onSwitchBudgetFile={onSwitchBudgetFile}
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
  onSwitchBudgetFile: () => void;
};

function BudgetPageMenu({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetFile,
  ...props
}: BudgetPageMenuProps) {
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

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
      case 'switch-budget-file':
        onSwitchBudgetFile?.();
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
        {
          name: 'switch-budget-file',
          text: 'Switch budget file',
        },
      ]}
    />
  );
}
