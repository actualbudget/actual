import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { Modal, ModalHeader } from '@desktop-client/components/common/Modal';

export function GoCardlessLink() {
  const { t } = useTranslation();

  window.close();
  return (
    <Modal name="gocardless-link" isDismissable={false}>
      <ModalHeader title={t('Account sync')} />
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
