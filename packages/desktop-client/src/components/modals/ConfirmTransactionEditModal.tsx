// @ts-strict-ignore
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { Block } from '../common/Block';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';

type ConfirmTransactionEditModalProps = Extract<
  ModalType,
  { name: 'confirm-transaction-edit' }
>['options'];

export function ConfirmTransactionEditModal({
  onCancel,
  onConfirm,
  confirmReason,
}: ConfirmTransactionEditModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      name="confirm-transaction-edit"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Reconciled Transaction')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            {confirmReason === 'batchDeleteWithReconciled' ? (
              <Block>
                <Trans>
                  Deleting reconciled transactions may bring your reconciliation
                  out of balance.
                </Trans>
              </Block>
            ) : confirmReason === 'batchEditWithReconciled' ? (
              <Block>
                <Trans>
                  Editing reconciled transactions may bring your reconciliation
                  out of balance.
                </Trans>
              </Block>
            ) : confirmReason === 'batchDuplicateWithReconciled' ? (
              <Block>
                <Trans>
                  Duplicating reconciled transactions may bring your
                  reconciliation out of balance.
                </Trans>
              </Block>
            ) : confirmReason === 'editReconciled' ? (
              <Block>
                <Trans>
                  Saving your changes to this reconciled transaction may bring
                  your reconciliation out of balance.
                </Trans>
              </Block>
            ) : confirmReason === 'unlockReconciled' ? (
              <Block>
                <Trans>
                  Unlocking this transaction means you won‘t be warned about
                  changes that can impact your reconciled balance. (Changes to
                  amount, account, payee, etc).
                </Trans>
              </Block>
            ) : confirmReason === 'deleteReconciled' ? (
              <Block>
                <Trans>
                  Deleting reconciled transactions may bring your reconciliation
                  out of balance.
                </Trans>
              </Block>
            ) : (
              <Block>
                <Trans>Are you sure you want to edit this transaction?</Trans>
              </Block>
            )}

            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  aria-label={t('Cancel')}
                  style={{ marginRight: 10 }}
                  onPress={() => {
                    close();
                    onCancel();
                  }}
                >
                  <Trans>Cancel</Trans>
                </Button>
                <InitialFocus>
                  <Button
                    aria-label={t('Confirm')}
                    variant="primary"
                    onPress={() => {
                      close();
                      onConfirm();
                    }}
                  >
                    <Trans>Confirm</Trans>
                  </Button>
                </InitialFocus>
              </View>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
