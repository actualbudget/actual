import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { addNotification, closeAndLoadBudget } from 'loot-core/client/actions';
import { type State } from 'loot-core/client/state-types';
import { send } from 'loot-core/platform/client/fetch';
import { getUserAccessErrors } from 'loot-core/shared/errors';
import { type Budget } from 'loot-core/types/budget';
import { type RemoteFile, type SyncedLocalFile } from 'loot-core/types/file';
import { type Handlers } from 'loot-core/types/handlers';

import { useActions } from '../../hooks/useActions';
import { useMetadataPref } from '../../hooks/useMetadataPref';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type TransferOwnershipProps = {
  onSave?: () => void;
};

export function TransferOwnership({
  onSave: originalOnSave,
}: TransferOwnershipProps) {
  const { t } = useTranslation();

  const userData = useSelector((state: State) => state.user.data);
  const actions = useActions();
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<[string, string][]>([]);
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const allFiles = useSelector(state => state.budgets.allFiles || []);
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
          addNotification({
            type: 'error',
            title: t('Error getting users'),
            message: t(
              'Failed to complete ownership transfer. Please try again.',
            ),
            sticky: true,
          });
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
  }, [userData?.userId, currentFile?.owner]);

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
          <Stack direction="row" style={{ marginTop: 10 }}>
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
                  />
                  <label
                    style={{
                      ...styles.verySmallText,
                      color: theme.pageTextLight,
                      marginTop: 5,
                    }}
                  >
                    {t(
                      'Select a user from the directory to designate as the new budget owner.',
                    )}
                  </label>
                  <label
                    style={{
                      ...styles.verySmallText,
                      color: theme.pageTextLight,
                      marginTop: 5,
                    }}
                  >
                    {t(
                      'This action is irreversible. Only the new owner or an administrator can reverse it.',
                    )}
                  </label>
                  <label
                    style={{
                      ...styles.verySmallText,
                      color: theme.pageTextLight,
                      marginTop: 5,
                    }}
                  >
                    {t('Proceed with caution.')}
                  </label>
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
                  {t('No users available')}
                </Text>
              )}
            </FormField>
          </Stack>

          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ marginTop: 20 }}
          >
            {error && <Text style={{ color: theme.errorText }}>{error}</Text>}
            <Button style={{ marginRight: 10 }} onPress={actions.popModal}>
              <Trans>Cancel</Trans>
            </Button>

            <Button
              isDisabled={
                availableUsers.length === 0 || !userId || isTransferring
              }
              onPress={async () => {
                setIsTransferring(true);
                try {
                  await onSave();
                  await dispatch(
                    closeAndLoadBudget((currentFile as Budget).id),
                  );
                  close();
                } catch (error) {
                  addNotification({
                    type: 'error',
                    title: t('Failed to transfer ownership'),
                    message: t(
                      'Failed to complete ownership transfer. Please try again.',
                    ),
                    sticky: true,
                  });
                  setIsTransferring(false);
                }
              }}
            >
              {isTransferring ? t('Transferring...') : t('Transfer ownership')}
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
