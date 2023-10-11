import React, { useState } from 'react';

import { colors } from '../../style';
import Block from '../common/Block';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Text from '../common/Text';
import View from '../common/View';

export default function ConfirmTransactionEdit({
  modalProps,
  onConfirm,
}) {
  return (
    <Modal title="Reconciled Transaction" {...modalProps} style={{ flex: 0 }}>
      {() => (
        <View style={{ lineHeight: 1.5 }}>
          <Block>
            Saving your changes to this reconciled transaction may bring your reconciliation out of balance.
          </Block>

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
              <Button
                type="primary"
                onClick={() => {
                  onConfirm();
                  modalProps.onClose();
                }}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
