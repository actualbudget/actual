import { useTranslation } from 'react-i18next';

import type { MenuItemObject } from '@actual-app/components/menu';

import { getAutomaticSyncMenuText } from '#components/banksync/bankSyncUtils';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { replaceModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type BankSyncMenuModalProps = Extract<
  ModalType,
  { name: 'bank-sync-menu' }
>['options'];

export function BankSyncMenuModal({
  hasProvidersItem,
  hasAutomaticSyncItem,
  onProvidersChange,
}: BankSyncMenuModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [interval] = useSyncedPref('bank-sync-interval');

  const items: MenuItemObject<string>[] = [];
  if (hasProvidersItem) {
    items.push({ name: 'providers', text: t('Providers') });
  }
  if (hasAutomaticSyncItem) {
    items.push({
      name: 'automatic-sync',
      text: getAutomaticSyncMenuText(interval, t),
    });
  }

  const onSelect = (name: string) => {
    if (name === 'providers') {
      dispatch(
        replaceModal({
          modal: {
            name: 'bank-sync-providers',
            options: { onProvidersChange },
          },
        }),
      );
      return;
    }

    dispatch(replaceModal({ modal: { name: 'bank-sync-automatic-sync' } }));
  };

  return (
    <MobileSheet name="bank-sync-menu" title={t('Bank Sync')}>
      <MobileSheetSection>
        <MobileSheetMenuRows items={items} onSelect={onSelect} />
      </MobileSheetSection>
    </MobileSheet>
  );
}
