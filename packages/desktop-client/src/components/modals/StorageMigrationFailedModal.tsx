import { useState } from 'react';
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
 * again. While no other budget in the browser is on the new storage there
 * is also a way out that needs no open budget: back to the previous storage
 * engine, which opens the budget as before. The report cannot be dismissed
 * while that is under way, as it is where a failure to go back is shown.
 * Where it could not be found out whether going back is possible, the
 * report says so and offers neither.
 */
export function StorageMigrationFailedModal({
  budgetId,
  message,
  canKeepPreviousStorage,
}: StorageMigrationFailedModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  // Another budget can move to the new storage while this is shown, which
  // the backend says when asked to go back
  const [canGoBack, setCanGoBack] = useState(canKeepPreviousStorage);
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
    if (error === 'other-budgets-moved') {
      setCanGoBack(false);
    } else if (error) {
      setGoingBackError(error);
    }
    if (error) {
      setIsGoingBack(false);
    }
  }

  return (
    <Modal
      name="storage-migration-failed"
      isDismissable={!isGoingBack}
      isKeyboardDismissDisabled={isGoingBack}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Budget could not be moved')}
            rightContent={
              !isGoingBack && <ModalCloseButton onPress={() => state.close()} />
            }
          />
          <View style={{ lineHeight: 1.5, maxWidth: 500 }}>
            <Paragraph>{message}</Paragraph>
            <Paragraph>
              {canGoBack == null ? (
                <Trans>
                  Actual could not check whether going back to the previous
                  storage is possible. Open the budget again to check once more.
                </Trans>
              ) : canGoBack ? (
                <Trans>
                  If it keeps failing, you can go back to the previous storage.
                  Actual then tries to open this budget the way it did before;
                  if it does not open by itself, pick it from the list of files.
                  The new storage engine can be turned on again under Settings →
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
              <Paragraph role="alert" style={{ color: theme.errorText }}>
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
              {canGoBack && (
                <ButtonWithLoading
                  style={narrowButtonStyle}
                  isLoading={isGoingBack}
                  isDisabled={isGoingBack}
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
