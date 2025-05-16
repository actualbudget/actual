// @ts-strict-ignore
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

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

  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

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
                justifyContent: 'flex-end',
              }}
            >
              <Button
                aria-label={t('Cancel')}
                style={{
                  marginRight: 10,
                  ...narrowButtonStyle,
                }}
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
                  style={{
                    marginRight: 10,
                    ...narrowButtonStyle,
                  }}
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
        </>
      )}
    </Modal>
  );
}
