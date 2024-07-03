// @ts-strict-ignore
import React from 'react';

import { Block } from '../common/Block';
import { Button } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

type ConfirmTransactionEditProps = {
  modalProps: Partial<CommonModalProps>;
  onConfirm: () => void;
  confirmReason: string;
};

export function ConfirmTransactionEdit({
  modalProps,
  onConfirm,
  confirmReason,
}: ConfirmTransactionEditProps) {
  return (
    <Modal title="Reconciled Transaction" {...modalProps} style={{ flex: 0 }}>
      {() => (
        <View style={{ lineHeight: 1.5 }}>
          {confirmReason === 'batchDeleteWithReconciled' ? (
            <Block>
              Deleting reconciled transactions may bring your reconciliation out
              of balance.
            </Block>
          ) : confirmReason === 'batchEditWithReconciled' ? (
            <Block>
              Editing reconciled transactions may bring your reconciliation out
              of balance.
            </Block>
          ) : confirmReason === 'batchDuplicateWithReconciled' ? (
            <Block>
              Duplicating reconciled transactions may bring your reconciliation
              out of balance.
            </Block>
          ) : confirmReason === 'editReconciled' ? (
            <Block>
              Saving your changes to this reconciled transaction may bring your
              reconciliation out of balance.
            </Block>
          ) : confirmReason === 'unlockReconciled' ? (
            <Block>
              Unlocking this transaction means you won‘t be warned about changes
              that can impact your reconciled balance. (Changes to amount,
              account, payee, etc).
            </Block>
          ) : confirmReason === 'deleteReconciled' ? (
            <Block>
              Deleting this reconciled transaction may bring your reconciliation
              out of balance.
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
              <Button style={{ marginRight: 10 }} onClick={modalProps.onClose}>
                Cancel
              </Button>
              <InitialFocus>
                <Button
                  type="primary"
                  onClick={() => {
                    modalProps.onClose();
                    onConfirm();
                  }}
                >
                  Confirm
                </Button>
              </InitialFocus>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
