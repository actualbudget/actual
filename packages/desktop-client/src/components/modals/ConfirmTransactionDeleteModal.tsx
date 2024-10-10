import React, { type FormEvent, useCallback } from 'react';
import { Form } from 'react-aria-components';

import { styles } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';
import { useResponsive } from '../responsive/ResponsiveProvider';

type ConfirmTransactionDeleteProps = {
  message?: string;
  onConfirm: () => void;
};

export function ConfirmTransactionDeleteModal({
  message = 'Are you sure you want to delete the transaction?',
  onConfirm,
}: ConfirmTransactionDeleteProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>, { close }: { close: () => void }) => {
      e.preventDefault();
      onConfirm();
      close();
    },
    [onConfirm],
  );

  return (
    <Modal name="confirm-transaction-delete">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Confirm Delete"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Form onSubmit={e => onSubmit(e, { close })}>
            <View style={{ lineHeight: 1.5 }}>
              <Paragraph>{message}</Paragraph>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  style={{
                    marginRight: 10,
                    ...narrowButtonStyle,
                  }}
                  onPress={close}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  style={narrowButtonStyle}
                  autoFocus
                >
                  Delete
                </Button>
              </View>
            </View>
          </Form>
        </>
      )}
    </Modal>
  );
}
