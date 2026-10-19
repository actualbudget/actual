import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';

type StorageMigrationFailedModalProps = Extract<
  ModalType,
  { name: 'storage-migration-failed' }
>['options'];

/**
 * Shown when a budget stored by an earlier version could not be moved to
 * the browser storage in use now. Nothing was lost, and opening the budget
 * again tries again.
 */
export function StorageMigrationFailedModal({
  message,
}: StorageMigrationFailedModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  return (
    <Modal name="storage-migration-failed">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Budget could not be moved')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5, maxWidth: 500 }}>
            <Paragraph>{message}</Paragraph>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 10,
              }}
            >
              <InitialFocus>
                <Button
                  variant="primary"
                  style={
                    isNarrowWidth ? { height: styles.mobileMinHeight } : {}
                  }
                  onPress={() => state.close()}
                >
                  <Trans>OK</Trans>
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
