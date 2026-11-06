import { useTranslation } from 'react-i18next';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Modal as ModalType } from '#modals/modalsSlice';

type AllAccountsMenuModalProps = Extract<
  ModalType,
  { name: 'all-accounts-menu' }
>['options'];

export function AllAccountsMenuModal({ onClose }: AllAccountsMenuModalProps) {
  const { t } = useTranslation();
  const [hideReconciled, setHideReconciled] = useSyncedPref(
    'hide-reconciled-all',
  );

  return (
    <MobileSheet
      name="all-accounts-menu"
      title={t('All Accounts')}
      onClose={onClose}
    >
      {() => (
        <MobileSheetSection>
          <MobileSheetRow
            label={
              hideReconciled !== 'true'
                ? t('Hide reconciled transactions')
                : t('Show reconciled transactions')
            }
            onPress={() => {
              setHideReconciled(hideReconciled === 'true' ? 'false' : 'true');
            }}
          />
        </MobileSheetSection>
      )}
    </MobileSheet>
  );
}
