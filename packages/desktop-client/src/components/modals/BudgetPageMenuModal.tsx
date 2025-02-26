import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { theme } from '../../style';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';

type BudgetPageMenuModalProps = ComponentPropsWithoutRef<typeof BudgetPageMenu>;

export function BudgetPageMenuModal({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetFile,
  onTogglePrivacyMode,
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
            onTogglePrivacyMode={onTogglePrivacyMode}
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
  onTogglePrivacyMode: () => void;
};

function BudgetPageMenu({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetFile,
  onTogglePrivacyMode,
  ...props
}: BudgetPageMenuProps) {
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
  const [isPrivacyEnabled] = useSyncedPref('isPrivacyEnabled');

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
      case 'toggle-privacy-filter':
        onTogglePrivacyMode?.();
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
    }
  };
  const { t } = useTranslation();

  return (
    <Menu
      {...props}
      onMenuSelect={onMenuSelect}
      items={[
        {
          name: 'add-category-group',
          text: t('Add category group'),
        },
        {
          name: 'toggle-hidden-categories',
          text: `${!showHiddenCategories ? t('Show hidden categories') : t('Hide hidden categories')}`,
        },
        {
          name: 'toggle-privacy-filter',
          text:
            isPrivacyEnabled === 'true'
              ? t('Disable privacy mode')
              : t('Enable privacy mode'),
        },
        {
          name: 'switch-budget-file',
          text: t('Switch budget file'),
        },
      ]}
    />
  );
}
