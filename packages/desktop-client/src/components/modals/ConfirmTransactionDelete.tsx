import React from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { styles } from '../../style';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
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
    <Modal title="Confirm Delete" {...modalProps}>
      <View style={{ lineHeight: 1.5 }}>
        <Paragraph>Are you sure you want to delete the transaction?</Paragraph>
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
            onClick={modalProps.onClose}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            style={narrowButtonStyle}
            onClick={() => {
              onConfirm();
              modalProps.onClose();
            }}
          >
            Delete
          </Button>
        </View>
      </View>
    </Modal>
  );
}
