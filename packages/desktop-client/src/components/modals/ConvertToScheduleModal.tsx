import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type ConvertToScheduleModalProps = Extract<
  ModalType,
  { name: 'convert-to-schedule' }
>['options'];

export function ConvertToScheduleModal({
  onCancel,
  onConfirm,
  isBeyondWindow,
  daysUntilTransaction,
  upcomingDays,
}: ConvertToScheduleModalProps) {
  const { t } = useTranslation();

  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  return (
    <Modal
      name="convert-to-schedule"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Convert to Schedule')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Block>
              <Trans>
                This transaction has a future date. Would you like to convert it
                to a single-time schedule instead?
              </Trans>
            </Block>
            {isBeyondWindow ? (
              <Block
                style={{
                  marginTop: 10,
                  padding: 10,
                  backgroundColor: theme.warningBackground,
                  borderRadius: 4,
                }}
              >
                <Trans>
                  <strong>Warning:</strong> This transaction is{' '}
                  {{ daysUntilTransaction }} days away, which is beyond your
                  configured upcoming length of {{ upcomingDays }} days. The
                  schedule preview will not be visible in your account until it
                  gets closer to the date.
                </Trans>
              </Block>
            ) : (
              <Block style={{ marginTop: 10 }}>
                <Trans>
                  The transaction will appear as a schedule preview in your
                  account.
                </Trans>
              </Block>
            )}
            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                aria-label={t('Cancel')}
                style={{
                  marginRight: 10,
                  ...narrowButtonStyle,
                  ...(isNarrowWidth && { flex: 1 }),
                }}
                onPress={() => {
                  close();
                  onCancel?.();
                }}
              >
                <Trans>No, keep as transaction</Trans>
              </Button>
              <InitialFocus>
                <Button
                  aria-label={t('Convert to Schedule')}
                  variant="primary"
                  style={{
                    ...narrowButtonStyle,
                    ...(isNarrowWidth && { flex: 1 }),
                  }}
                  onPress={() => {
                    close();
                    onConfirm();
                  }}
                >
                  <Trans>Yes, create schedule</Trans>
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
