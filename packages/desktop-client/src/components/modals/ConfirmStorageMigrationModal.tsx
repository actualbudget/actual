import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { format } from 'date-fns';

import { loadBudget } from '#budgetfiles/budgetfilesSlice';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import {
  describePreviousStorageError,
  returnToPreviousStorage,
} from '#util/previous-storage';
import type { PreviousStorageError } from '#util/previous-storage';

type ConfirmStorageMigrationModalProps = Extract<
  ModalType,
  { name: 'confirm-storage-migration' }
>['options'];

type BackupState =
  | { status: 'none' | 'saving' | 'failed' }
  | { status: 'saved'; warnings: string[] };

/**
 * Asks before a budget is moved from the previous browser storage to the
 * new one, and offers a backup of it first. The budget is only opened, and
 * with that moved, once the user continues. While nothing in the browser
 * has been moved yet they can also put it off, which takes the browser back
 * to the previous storage engine and opens the budget there.
 */
export function ConfirmStorageMigrationModal({
  budgetId,
  canKeepPreviousStorage,
}: ConfirmStorageMigrationModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const [backup, setBackup] = useState<BackupState>({ status: 'none' });
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [goingBackError, setGoingBackError] =
    useState<PreviousStorageError | null>(null);
  const narrowButtonStyle = isNarrowWidth
    ? { height: styles.mobileMinHeight }
    : {};
  const isBackupSaved = backup.status === 'saved';
  const isBusy = isGoingBack || backup.status === 'saving';

  async function downloadBackup() {
    setBackup({ status: 'saving' });
    try {
      const response = await send('export-unopened-budget', { id: budgetId });
      if ('error' in response) {
        setBackup({ status: 'failed' });
        return;
      }
      await window.Actual.saveFile(
        response.data,
        `${format(new Date(), 'yyyy-MM-dd')}-${response.budgetName}.zip`,
        t('Export budget'),
      );
      setBackup({ status: 'saved', warnings: response.warnings });
    } catch {
      setBackup({ status: 'failed' });
    }
  }

  // The page reloads when this works, so only a failure comes back
  async function keepPreviousStorage() {
    setIsGoingBack(true);
    setGoingBackError(null);
    const error = await returnToPreviousStorage(budgetId);
    if (error) {
      setGoingBackError(error);
      setIsGoingBack(false);
    }
  }

  return (
    <Modal name="confirm-storage-migration">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Move budget to new storage')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5, maxWidth: 500 }}>
            <Paragraph>
              {canKeepPreviousStorage ? (
                <Trans>
                  Actual has a new, faster way of storing budgets in your
                  browser. Opening this budget moves it there, which only
                  happens once.
                </Trans>
              ) : (
                <Trans>
                  Actual has a new, faster way of storing budgets in your
                  browser. This budget needs to be moved to it before it can be
                  opened, which only happens once.
                </Trans>
              )}
            </Paragraph>
            <Paragraph>
              <Trans>
                We recommend downloading a backup first. If anything goes wrong,
                you can import the backup again from the list of budget files.
              </Trans>
            </Paragraph>
            <Paragraph>
              {canKeepPreviousStorage ? (
                <Trans>
                  <strong>Not now</strong> opens this budget on the previous
                  storage and turns the new storage engine off again. You can
                  turn it back on under Settings → Experimental.
                </Trans>
              ) : (
                <Trans>
                  Other budgets in this browser already use the new storage, so
                  this one has to move as well. To go back to the previous
                  storage for all of them, open one of those budgets and turn
                  the new storage engine off under Settings → Experimental.
                </Trans>
              )}
            </Paragraph>
            {isBackupSaved && (
              <Paragraph>
                <Trans>Backup downloaded. You can continue now.</Trans>
              </Paragraph>
            )}
            {backup.status === 'failed' && (
              <Paragraph style={{ color: theme.errorText }}>
                <Trans>
                  An unknown error occurred while exporting. Please report this
                  as a new issue on GitHub.
                </Trans>
              </Paragraph>
            )}
            {goingBackError && (
              <Paragraph style={{ color: theme.errorText }}>
                {describePreviousStorageError(goingBackError)}
              </Paragraph>
            )}
            {isBackupSaved &&
              backup.warnings.includes('exceeds-import-size-limit') && (
                <Text style={{ color: theme.warningText }}>
                  <Trans>
                    This export is larger than Actual can safely re-import. You
                    may not be able to restore this backup.
                  </Trans>
                </Text>
              )}
            {isBackupSaved &&
              backup.warnings.includes('may-exceed-available-memory') && (
                <Text style={{ color: theme.warningText }}>
                  <Trans>
                    This export is larger than the memory available on this
                    device. Restoring it here may fail.
                  </Trans>
                </Text>
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
              {canKeepPreviousStorage ? (
                <ButtonWithLoading
                  style={narrowButtonStyle}
                  isLoading={isGoingBack}
                  isDisabled={isBusy}
                  onPress={keepPreviousStorage}
                >
                  <Trans>Not now</Trans>
                </ButtonWithLoading>
              ) : (
                <Button
                  style={narrowButtonStyle}
                  isDisabled={isBusy}
                  onPress={() => state.close()}
                >
                  <Trans>Cancel</Trans>
                </Button>
              )}
              <Button
                variant={isBackupSaved ? 'primary' : 'normal'}
                style={narrowButtonStyle}
                isDisabled={isBusy}
                onPress={() => {
                  state.close();
                  void dispatch(
                    loadBudget({ id: budgetId, allowStorageMigration: true }),
                  );
                }}
              >
                <Trans>Continue</Trans>
              </Button>
              <InitialFocus>
                <ButtonWithLoading
                  variant={isBackupSaved ? 'normal' : 'primary'}
                  style={narrowButtonStyle}
                  isLoading={backup.status === 'saving'}
                  isDisabled={isBusy}
                  onPress={downloadBackup}
                >
                  <Trans>Download backup</Trans>
                </ButtonWithLoading>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
