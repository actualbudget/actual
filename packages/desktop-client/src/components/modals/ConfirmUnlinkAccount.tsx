import React from 'react';

import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

type ConfirmUnlinkAccountProps = {
  modalProps: CommonModalProps;
  accountName: string;
  onUnlink: () => void;
};

export function ConfirmUnlinkAccount({
  modalProps,
  accountName,
  onUnlink,
}: ConfirmUnlinkAccountProps) {
  return (
    <Modal title="Confirm Unlink" {...modalProps} style={{ flex: 0 }}>
      {() => (
        <View style={{ lineHeight: 1.5 }}>
          <Paragraph>
            Are you sure you want to unlink <strong>{accountName}</strong>?
          </Paragraph>

          <Paragraph>
            Transactions will no longer be synchronized with this account and
            must be manually entered.
          </Paragraph>

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
                onUnlink();
                modalProps.onClose();
              }}
            >
              Unlink
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
