import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { useResponsive } from '../responsive/ResponsiveProvider';

type ConfirmTransactionDeleteModalProps = Extract<
  ModalType,
  { name: 'confirm-transaction-delete' }
>['options'];

export function ConfirmTransactionDeleteModal({
  message = 'Are you sure you want to delete the transaction?',
  onConfirm,
}: ConfirmTransactionDeleteModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  return (
    <Modal name="confirm-transaction-delete">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Confirm Delete')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
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
                {t('Cancel')}
              </Button>
              <InitialFocus>
                <Button
                  variant="primary"
                  style={narrowButtonStyle}
                  onPress={() => {
                    onConfirm();
                    close();
                  }}
                >
                  {t('Delete')}
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
