import { useTranslation } from 'react-i18next';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { validateAccountName } from '#components/util/accountValidation';
import { useAccount } from '#hooks/useAccount';
import { useAccounts } from '#hooks/useAccounts';
import { useNotes } from '#hooks/useNotes';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Modal as ModalType } from '#modals/modalsSlice';

type AccountMenuModalProps = Extract<
  ModalType,
  { name: 'account-menu' }
>['options'];

export function AccountMenuModal({
  accountId,
  onSave,
  onCloseAccount,
  onReopenAccount,
  onEditNotes,
  onClose,
  onReconcile,
}: AccountMenuModalProps) {
  const { t } = useTranslation();
  const account = useAccount(accountId);
  const { data: accounts = [] } = useAccounts();
  const notes = useNotes(`account-${accountId}`);
  const [showBalances, setShowBalances] = useSyncedPref(
    `show-balances-${accountId}`,
  );
  const [hideReconciled, setHideReconciled] = useSyncedPref(
    `hide-reconciled-${accountId}`,
  );

  if (!account) {
    return null;
  }

  const onRename = (newName: string) => {
    const error = validateAccountName(newName, accountId, accounts);
    if (error) {
      return error;
    }
    onSave?.({ ...account, name: newName });
  };

  return (
    <MobileSheet
      name="account-menu"
      title={account.name}
      onTitleUpdate={onRename}
      onClose={onClose}
    >
      {({ editTitle, isEditingTitle }) => (
        <>
          {notes && <MobileSheetNotes notes={notes} />}

          <MobileSheetSection>
            {!isEditingTitle && (
              <MobileSheetRow label={t('Rename')} onPress={editTitle} />
            )}
            <MobileSheetRow
              label={t('Edit notes')}
              onPress={() => onEditNotes?.(account.id)}
            />
            {onReconcile && (
              <MobileSheetRow
                label={t('Reconcile')}
                onPress={() => onReconcile()}
              />
            )}
            <MobileSheetRow
              label={
                showBalances === 'true'
                  ? t('Hide running balance')
                  : t('Show running balance')
              }
              onPress={() => {
                setShowBalances(showBalances === 'true' ? 'false' : 'true');
              }}
            />
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
            {account.closed ? (
              <MobileSheetRow
                label={t('Reopen account')}
                onPress={() => onReopenAccount?.(account.id)}
              />
            ) : (
              <MobileSheetRow
                label={t('Close account')}
                isDestructive
                onPress={() => onCloseAccount?.(account.id)}
              />
            )}
          </MobileSheetSection>
        </>
      )}
    </MobileSheet>
  );
}
