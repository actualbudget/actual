import React from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { styles } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

type ConfirmTransactionDeleteProps = {
  modalProps: CommonModalProps;
  onConfirm: () => void;
};

export function ConfirmTransactionDelete({
  modalProps,
  onConfirm,
}: ConfirmTransactionDeleteProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  return (
    <Modal {...modalProps}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Confirm Delete"
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Paragraph>
              Are you sure you want to delete the transaction?
            </Paragraph>
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
                style={narrowButtonStyle}
                onPress={() => {
                  onConfirm();
                  close();
                }}
              >
                Delete
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
