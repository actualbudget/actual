// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation

import { Block } from '../common/Block';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';

type ConfirmTransactionEditProps = {
  onCancel?: () => void;
  onConfirm: () => void;
  confirmReason: string;
};

export function ConfirmTransactionEditModal({
  onCancel,
  onConfirm,
  confirmReason,
}: ConfirmTransactionEditProps) {
  const { t } = useTranslation(); // Initialize translation hook

  return (
    <Modal
      name="confirm-transaction-edit"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Reconciled Transaction')} // Use translation for title
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            {confirmReason === 'batchDeleteWithReconciled' ? (
              <Block>
                {t(
                  'Deleting reconciled transactions may bring your reconciliation out of balance.',
                )}
              </Block>
            ) : confirmReason === 'batchEditWithReconciled' ? (
              <Block>
                {t(
                  'Editing reconciled transactions may bring your reconciliation out of balance.',
                )}
              </Block>
            ) : confirmReason === 'batchDuplicateWithReconciled' ? (
              <Block>
                {t(
                  'Duplicating reconciled transactions may bring your reconciliation out of balance.',
                )}
              </Block>
            ) : confirmReason === 'editReconciled' ? (
              <Block>
                {t(
                  'Saving your changes to this reconciled transaction may bring your reconciliation out of balance.',
                )}
              </Block>
            ) : confirmReason === 'unlockReconciled' ? (
              <Block>
                {t(
                  'Unlocking this transaction means you won‘t be warned about changes that can impact your reconciled balance. (Changes to amount, account, payee, etc).',
                )}
              </Block>
            ) : confirmReason === 'deleteReconciled' ? (
              <Block>
                {t(
                  'Deleting this reconciled transaction may bring your reconciliation out of balance.',
                )}
              </Block>
            ) : (
              <Block>
                {t('Are you sure you want to edit this transaction?')}
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
                  aria-label={t('Cancel')} // Use translation for aria-label
                  style={{ marginRight: 10 }}
                  onPress={() => {
                    close();
                    onCancel();
                  }}
                >
                  {t('Cancel')} {/* Use translation for Cancel */}
                </Button>
                <InitialFocus>
                  <Button
                    aria-label={t('Confirm')} // Use translation for aria-label
                    variant="primary"
                    onPress={() => {
                      close();
                      onConfirm();
                    }}
                  >
                    {t('Confirm')} {/* Use translation for Confirm */}
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
