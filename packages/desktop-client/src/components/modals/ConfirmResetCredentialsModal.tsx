import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type ConfirmResetCredentialsModalProps = Extract<
  ModalType,
  { name: 'confirm-reset-credentials' }
>['options'];

export function ConfirmResetCredentialsModal({
  message,
  onConfirm,
}: ConfirmResetCredentialsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal name="confirm-reset-credentials">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Reset credentials')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Paragraph>{message}</Paragraph>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <Button onPress={close}>
                <Trans>Cancel</Trans>
              </Button>
              <InitialFocus>
                <Button
                  variant="primary"
                  onPress={() => {
                    onConfirm();
                    close();
                  }}
                >
                  <Trans>Reset</Trans>
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
