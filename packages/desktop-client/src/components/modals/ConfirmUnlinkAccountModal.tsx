import React, { type FormEvent, useCallback } from 'react';
import { Form } from 'react-aria-components';

import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';

type ConfirmUnlinkAccountProps = {
  accountName: string;
  onUnlink: () => void;
};

export function ConfirmUnlinkAccountModal({
  accountName,
  onUnlink,
}: ConfirmUnlinkAccountProps) {
  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>, { close }: { close: () => void }) => {
      e.preventDefault();

      onUnlink();
      close();
    },
    [onUnlink],
  );
  return (
    <Modal
      name="confirm-unlink-account"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Confirm Unlink"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Form onSubmit={e => onSubmit(e, { close })}>
            <View style={{ lineHeight: 1.5 }}>
              <Paragraph>
                Are you sure you want to unlink <strong>{accountName}</strong>?
              </Paragraph>

              <Paragraph>
                Transactions will no longer be synchronized with this account
                and must be manually entered.
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
                <Button variant="primary" type="submit" autoFocus>
                  Unlink
                </Button>
              </View>
            </View>
          </Form>
        </>
      )}
    </Modal>
  );
}
