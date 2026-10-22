import { useTranslation } from 'react-i18next';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { useLocalPref } from '#hooks/useLocalPref';
import type { Modal as ModalType } from '#modals/modalsSlice';

type BudgetPageMenuModalProps = Extract<
  ModalType,
  { name: 'budget-page-menu' }
>['options'];

export function BudgetPageMenuModal({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetFile,
}: BudgetPageMenuModalProps) {
  const { t } = useTranslation();
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

  return (
    <MobileSheet name="budget-page-menu" title={t('Budget')}>
      {({ close }) => (
        <>
          <MobileSheetRow
            label={t('Add category group')}
            onPress={onAddCategoryGroup}
          />
          <MobileSheetRow
            label={
              showHiddenCategories
                ? t('Hide hidden categories')
                : t('Show hidden categories')
            }
            onPress={onToggleHiddenCategories}
          />
          <MobileSheetRow
            label={t('Switch budget file')}
            onPress={() => {
              close();
              onSwitchBudgetFile();
            }}
          />
        </>
      )}
    </MobileSheet>
  );
}
