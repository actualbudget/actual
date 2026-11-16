import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { getSyncError } from '#util/error';
import {
  describePreviousStorageError,
  returnToPreviousStorage,
} from '#util/previous-storage';
import type { PreviousStorageError } from '#util/previous-storage';

type StorageMigrationFailedModalProps = Extract<
  ModalType,
  { name: 'storage-migration-failed' }
>['options'];

/**
 * Shown when a budget could not be moved from the previous browser storage
 * to the new one. Nothing was lost, and opening the budget again tries
 * again. While nothing in the browser has been moved yet there is also a
 * way out that needs no open budget: back to the previous storage engine,
 * which opens the budget as before.
 */
export function StorageMigrationFailedModal({
  budgetId,
  canKeepPreviousStorage,
}: StorageMigrationFailedModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [goingBackError, setGoingBackError] =
    useState<PreviousStorageError | null>(null);
  const narrowButtonStyle = isNarrowWidth
    ? { height: styles.mobileMinHeight }
    : {};

  // The page reloads when this works, so only a failure comes back
  async function goBackToPreviousStorage() {
    setIsGoingBack(true);
    setGoingBackError(null);
    const error = await returnToPreviousStorage(budgetId);
    if (error) {
      setGoingBackError(error);
      setIsGoingBack(false);
    }
  }

  return (
    <Modal name="storage-migration-failed">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Budget could not be moved')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5, maxWidth: 500 }}>
            <Paragraph>
              {getSyncError('storage-migration-failed', budgetId)}
            </Paragraph>
            <Paragraph>
              {canKeepPreviousStorage ? (
                <Trans>
                  If it keeps failing, you can go back to the previous storage.
                  That opens this budget as before and turns the new storage
                  engine off again. You can turn it back on under Settings →
                  Experimental.
                </Trans>
              ) : (
                <Trans>
                  Other budgets in this browser already use the new storage. To
                  go back to the previous storage for all of them, open one of
                  those budgets and turn the new storage engine off under
                  Settings → Experimental.
                </Trans>
              )}
            </Paragraph>
            {goingBackError && (
              <Paragraph style={{ color: theme.errorText }}>
                {describePreviousStorageError(goingBackError)}
              </Paragraph>
            )}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 10,
              }}
            >
              {canKeepPreviousStorage && (
                <ButtonWithLoading
                  style={narrowButtonStyle}
                  isLoading={isGoingBack}
                  onPress={goBackToPreviousStorage}
                >
                  <Trans>Go back to previous storage</Trans>
                </ButtonWithLoading>
              )}
              <InitialFocus>
                <Button
                  variant="primary"
                  style={narrowButtonStyle}
                  isDisabled={isGoingBack}
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
