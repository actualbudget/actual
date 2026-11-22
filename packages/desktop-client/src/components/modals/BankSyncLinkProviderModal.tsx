import { useTranslation } from 'react-i18next';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { collapseModals } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type BankSyncLinkProviderModalProps = Extract<
  ModalType,
  { name: 'bank-sync-link-provider' }
>['options'];

export function BankSyncLinkProviderModal({
  linkProviders,
}: BankSyncLinkProviderModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return (
    <MobileSheet name="bank-sync-link-provider" title={t('Link bank account')}>
      <MobileSheetSection>
        <MobileSheetMenuRows
          items={linkProviders.map(provider => ({
            name: provider.id,
            text: provider.displayName,
          }))}
          onSelect={id => {
            dispatch(
              collapseModals({ rootModalName: 'bank-sync-link-provider' }),
            );
            void linkProviders.find(provider => provider.id === id)?.onLink();
          }}
        />
      </MobileSheetSection>
    </MobileSheet>
  );
}
