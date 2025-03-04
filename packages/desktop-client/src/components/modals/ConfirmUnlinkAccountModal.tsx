import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';

type ConfirmUnlinkAccountModalProps = Extract<
  ModalType,
  { name: 'confirm-unlink-account' }
>['options'];

export function ConfirmUnlinkAccountModal({
  accountName,
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
              Are you sure you want to unlink <strong>{accountName}</strong>?
            </Paragraph>

            <Paragraph>
              {t(
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
                {t('Cancel')}
              </Button>
              <InitialFocus>
                <Button
                  variant="primary"
                  onPress={() => {
                    onUnlink();
                    close();
                  }}
                >
                  {t('Unlink')}
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
