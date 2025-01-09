import React from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';

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
