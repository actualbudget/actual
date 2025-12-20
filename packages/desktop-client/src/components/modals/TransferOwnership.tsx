import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { getUserAccessErrors } from 'loot-core/shared/errors';
import { type Budget } from 'loot-core/types/budget';
import { type RemoteFile, type SyncedLocalFile } from 'loot-core/types/file';
import { type Handlers } from 'loot-core/types/handlers';

import { closeAndLoadBudget } from '@desktop-client/budgetfiles/budgetfilesSlice';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import {
  type Modal as ModalType,
  popModal,
} from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

type TransferOwnershipProps = Extract<
  ModalType,
  { name: 'transfer-ownership' }
>['options'];

export function TransferOwnership({
  onSave: originalOnSave,
}: TransferOwnershipProps) {
  const { t } = useTranslation();

  const userData = useSelector(state => state.user.data);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<[string, string][]>([]);
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const allFiles = useSelector(state => state.budgetfiles.allFiles || []);
  const remoteFiles = allFiles.filter(
    f => f.state === 'remote' || f.state === 'synced' || f.state === 'detached',
  ) as (SyncedLocalFile | RemoteFile)[];
  const currentFile = remoteFiles.find(f => f.cloudFileId === cloudFileId);
  const dispatch = useDispatch();
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    send('users-get').then(
      (data: Awaited<ReturnType<Handlers['users-get']>>) => {
        if (!data) {
          setAvailableUsers([]);
        } else if ('error' in data) {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                title: t('Error getting users'),
                message: t(
                  'Failed to complete ownership transfer. Please try again.',
                ),
                sticky: true,
              },
            }),
          );
        } else {
          setAvailableUsers(
            data
              .filter(f => currentFile?.owner !== f.id)
              .map(user => [
                user.id,
                user.displayName
                  ? `${user.displayName} (${user.userName})`
                  : user.userName,
              ]),
          );
        }
      },
    );
  }, [userData?.userId, currentFile?.owner, t, dispatch]);

  async function onSave() {
    if (cloudFileId) {
      const response = await send('transfer-ownership', {
        fileId: cloudFileId as string,
        newUserId: userId,
      });
      const { error } = response || {};
      if (!error) {
        originalOnSave?.();
      } else {
        setError(getUserAccessErrors(error));
      }
    } else {
      setError(t('Cloud file ID is missing.'));
    }
  }

  return (
    <Modal name="transfer-ownership">
      {({ state: { close } }: { state: { close: () => void } }) => (
        <>
          <ModalHeader
            title={t('Transfer ownership')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <SpaceBetween style={{ marginTop: 10 }}>
            <FormField style={{ flex: 1 }}>
              <FormLabel title={t('User')} htmlFor="user-field" />
              {availableUsers.length > 0 && (
                <View>
                  <Select
                    options={availableUsers}
                    onChange={(newValue: string) => {
                      setUserId(newValue);
                    }}
                    value={userId}
                    defaultLabel={t('Select a user')}
                  />
                  <Text
                    style={{
                      ...styles.verySmallText,
                      color: theme.pageTextLight,
                      marginTop: 5,
                    }}
                  >
                    <Trans>
                      Select a user from the directory to designate as the new
                      budget owner.
                    </Trans>
                  </Text>
                  <Text
                    style={{
                      ...styles.verySmallText,
                      color: theme.errorText,
                      marginTop: 5,
                    }}
                  >
                    {t(
                      'This action is irreversible, ownership of this budget file will only be able to be transferred by the server administrator or new owner.',
                    )}
                  </Text>
                  <Text
                    style={{
                      ...styles.verySmallText,
                      color: theme.errorText,
                      marginTop: 5,
                    }}
                  >
                    <Trans>Proceed with caution.</Trans>
                  </Text>
                </View>
              )}
              {availableUsers.length === 0 && (
                <Text
                  style={{
                    ...styles.verySmallText,
                    color: theme.pageTextLight,
                    marginTop: 5,
                  }}
                >
                  <Trans>No users available</Trans>
                </Text>
              )}
            </FormField>
          </SpaceBetween>

          <SpaceBetween
            style={{
              marginTop: 20,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            {error && <Text style={{ color: theme.errorText }}>{error}</Text>}
            <Button
              style={{ marginRight: 10 }}
              onPress={() => dispatch(popModal())}
            >
              <Trans>Cancel</Trans>
            </Button>

            <Button
              variant="primary"
              isDisabled={
                availableUsers.length === 0 || !userId || isTransferring
              }
              onPress={async () => {
                setIsTransferring(true);
                try {
                  await onSave();
                  await dispatch(
                    closeAndLoadBudget({ fileId: (currentFile as Budget).id }),
                  );
                  close();
                } catch {
                  dispatch(
                    addNotification({
                      notification: {
                        type: 'error',
                        title: t('Failed to transfer ownership'),
                        message: t(
                          'Failed to complete ownership transfer. Please try again.',
                        ),
                        sticky: true,
                      },
                    }),
                  );
                  setIsTransferring(false);
                }
              }}
            >
              {isTransferring ? t('Transferring...') : t('Transfer ownership')}
            </Button>
          </SpaceBetween>
        </>
      )}
    </Modal>
  );
}
