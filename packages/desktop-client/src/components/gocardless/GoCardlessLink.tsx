import React from 'react';
import { Trans } from 'react-i18next';

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { Modal, ModalHeader } from '../common/Modal';

export function GoCardlessLink() {
  window.close();
  return (
    <Modal name="gocardless-link" isDismissable={false}>
      <ModalHeader title="Account sync" />
      <View style={{ maxWidth: 500 }}>
        <Paragraph>
          <Trans>Please wait...</Trans>
        </Paragraph>
        <Paragraph>
          <Trans>
            The window should close automatically. If nothing happened you can
            close this window or tab.
          </Trans>
        </Paragraph>
      </View>
    </Modal>
  );
}
