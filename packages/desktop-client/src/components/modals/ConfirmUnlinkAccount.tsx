import React from 'react';

import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
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
    <Modal {...modalProps} contentProps={{ style: { flex: 0 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Confirm Unlink"
            rightContent={<ModalCloseButton onClick={close} />}
          />
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
              <Button style={{ marginRight: 10 }} onPress={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  onUnlink();
                  close();
                }}
              >
                Unlink
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
