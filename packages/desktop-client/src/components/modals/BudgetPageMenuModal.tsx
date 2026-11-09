import { useTranslation } from 'react-i18next';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { useLocalPref } from '#hooks/useLocalPref';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

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
  const dispatch = useDispatch();
  const { isEnabled: isMultiCurrencyEnabled } = useMultiCurrency();

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
          {isMultiCurrencyEnabled && (
            <MobileSheetRow
              label={t('Budget currencies on their own')}
              onPress={() => {
                close();
                dispatch(pushModal({ modal: { name: 'currency-own-lines' } }));
              }}
            />
          )}
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
