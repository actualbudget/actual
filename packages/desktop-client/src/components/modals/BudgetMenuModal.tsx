import React, { type ComponentPropsWithoutRef } from 'react';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { type CSSProperties, theme, styles } from '../../style';
import { Menu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

type BudgetMenuModalProps = ComponentPropsWithoutRef<typeof BudgetMenu> & {
  modalProps: CommonModalProps;
};

export function BudgetMenuModal({
  modalProps,
  month,
  onToggleHiddenCategories,
  onSwitchBudgetType,
}: BudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal
      title="Budget actions"
      showHeader
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        padding: '0 10px',
        paddingBottom: 10,
        borderRadius: '6px',
      }}
    >
      {() => (
        <BudgetMenu
          getItemStyle={() => defaultMenuItemStyle}
          month={month}
          onToggleHiddenCategories={onToggleHiddenCategories}
          onSwitchBudgetType={onSwitchBudgetType}
        />
      )}
    </Modal>
  );
}

type BudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  month: string;
  onToggleHiddenCategories: () => void;
  onSwitchBudgetType: () => void;
};

function BudgetMenu({
  // onEditMode,
  month,
  onToggleHiddenCategories,
  onSwitchBudgetType,
  ...props
}: BudgetMenuProps) {
  const isReportBudgetEnabled = useFeatureFlag('reportBudget');

  const onMenuSelect = (name: string) => {
    switch (name) {
      // case 'edit-mode':
      //   onEditMode?.(true);
      //   break;
      case 'toggle-hidden-categories':
        onToggleHiddenCategories?.();
        break;
      case 'switch-budget-type':
        onSwitchBudgetType?.();
        break;
      default:
        throw new Error(`Unrecognized menu option: ${name}`);
    }
  };

  return (
    <Menu
      {...props}
      onMenuSelect={onMenuSelect}
      items={[
        // Removing for now until we work on mobile category drag and drop.
        // { name: 'edit-mode', text: 'Edit mode' },
        {
          name: 'toggle-hidden-categories',
          text: 'Toggle hidden categories',
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
