// @ts-strict-ignore
import React from 'react';

import { Block } from '../common/Block';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { View } from '../common/View';

type ConfirmTransactionEditProps = {
  onCancel?: () => void;
  onConfirm: () => void;
  confirmReason: string;
};

export function ConfirmTransactionEdit({
  onCancel,
  onConfirm,
  confirmReason,
}: ConfirmTransactionEditProps) {
  return (
    <Modal
      name="confirm-transaction-edit"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Reconciled Transaction"
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            {confirmReason === 'batchDeleteWithReconciled' ? (
              <Block>
                Deleting reconciled transactions may bring your reconciliation
                out of balance.
              </Block>
            ) : confirmReason === 'batchEditWithReconciled' ? (
              <Block>
                Editing reconciled transactions may bring your reconciliation
                out of balance.
              </Block>
            ) : confirmReason === 'batchDuplicateWithReconciled' ? (
              <Block>
                Duplicating reconciled transactions may bring your
                reconciliation out of balance.
              </Block>
            ) : confirmReason === 'editReconciled' ? (
              <Block>
                Saving your changes to this reconciled transaction may bring
                your reconciliation out of balance.
              </Block>
            ) : confirmReason === 'unlockReconciled' ? (
              <Block>
                Unlocking this transaction means you won‘t be warned about
                changes that can impact your reconciled balance. (Changes to
                amount, account, payee, etc).
              </Block>
            ) : confirmReason === 'deleteReconciled' ? (
              <Block>
                Deleting this reconciled transaction may bring your
                reconciliation out of balance.
              </Block>
            ) : (
              <Block>Are you sure you want to edit this transaction?</Block>
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
                  aria-label="Cancel"
                  style={{ marginRight: 10 }}
                  onPress={() => {
                    close();
                    onCancel();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  aria-label="Confirm"
                  variant="primary"
                  onPress={() => {
                    close();
                    onConfirm();
                  }}
                >
                  Confirm
                </Button>
              </View>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
