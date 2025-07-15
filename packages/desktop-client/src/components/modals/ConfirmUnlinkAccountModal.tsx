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

type ConfirmUnlinkAccountModalProps = Extract<
  ModalType,
  { name: 'confirm-unlink-account' }
>['options'];

export function ConfirmUnlinkAccountModal({
  accountName,
  isViewBankSyncSettings,
  onUnlink,
}: ConfirmUnlinkAccountModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      name="confirm-unlink-account"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Confirm Unlink')} // Use translation for title
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Paragraph>
              <Trans>
                Are you sure you want to unlink <strong>{accountName}</strong>?
              </Trans>
            </Paragraph>

            <Paragraph>
              {isViewBankSyncSettings
                ? t(
                    'Transactions will no longer be synchronized with this account and must be manually entered. You will not be able to edit the bank sync settings for this account and the settings will close.',
                  )
                : t(
                    'Transactions will no longer be synchronized with this account and must be manually entered.',
                  )}
            </Paragraph>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <Button style={{ marginRight: 10 }} onPress={close}>
                <Trans>Cancel</Trans>
              </Button>
              <InitialFocus>
                <Button
                  variant="primary"
                  onPress={() => {
                    onUnlink();
                    close();
                  }}
                >
                  <Trans>Unlink</Trans>
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
