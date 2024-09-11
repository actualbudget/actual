import React from 'react';

import { Modal, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';

export function GoCardlessLink() {
  window.close();
  return (
    <Modal name="gocardless-link" isDismissable={false}>
      <ModalHeader title="Account sync" />
      <View style={{ maxWidth: 500 }}>
        <Paragraph>Please wait...</Paragraph>
        <Paragraph>
          The window should close automatically. If nothing happened you can
          close this window or tab.
        </Paragraph>
      </View>
    </Modal>
  );
}
