import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/fetch';
import { getUserAccessErrors } from 'loot-core/shared/errors';
import { type Handlers } from 'loot-core/types/handlers';
import { type UserAccessEntity } from 'loot-core/types/models/userAccess';

import { useActions } from '../../hooks/useActions';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type EditUserAccessProps = {
  defaultUserAccess: UserAccessEntity;
  onSave?: (userAccess: UserAccessEntity) => void;
};

export function EditUserAccess({
  defaultUserAccess,
  onSave: originalOnSave,
}: EditUserAccessProps) {
  const { t } = useTranslation();

  const actions = useActions();
  const [userId, setUserId] = useState(defaultUserAccess.userId ?? '');
  const [error, setSetError] = useState('');
  const [availableUsers, setAvailableUsers] = useState<[string, string][]>([]);

  useEffect(() => {
    send('access-get-available-users', defaultUserAccess.fileId).then(
      (data: Awaited<ReturnType<Handlers['access-get-available-users']>>) => {
        if ('error' in data) {
          setSetError(data.error);
        } else {
          setAvailableUsers(
            data.map(user => [
              user.userId,
              user.displayName
                ? `${user.displayName} (${user.userName})`
                : user.userName,
            ]),
          );
        }
      },
    );
  }, [defaultUserAccess.fileId, actions]);

  async function onSave(close: () => void) {
    const userAccess = {
      ...defaultUserAccess,
      userId,
    };

    const { error } = await send('access-add', userAccess);
    if (!error) {
      originalOnSave?.(userAccess);
      close();
    } else {
      if (error === 'token-expired') {
        actions.addNotification({
          type: 'error',
          id: 'login-expired',
          title: t('Login expired'),
          sticky: true,
          message: getUserAccessErrors(error),
          button: {
            title: t('Go to login'),
            action: () => {
              actions.signOut();
            },
          },
        });
      } else {
        setSetError(getUserAccessErrors(error));
      }
    }
  }

  return (
    <Modal name="edit-access">
      {({ state: { close } }: { state: { close: () => void } }) => (
        <>
          <ModalHeader
            title={t('User Access')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Stack direction="row" style={{ marginTop: 10 }}>
            <FormField style={{ flex: 1 }}>
              <FormLabel title={t('User')} htmlFor="user-field" />
              {availableUsers.length > 0 && (
                <View>
                  <Select
                    options={availableUsers}
                    onChange={(newValue: string) => setUserId(newValue)}
                    value={userId}
                  />
                  <label
                    style={{
                      ...styles.verySmallText,
                      color: theme.pageTextLight,
                      marginTop: 5,
                    }}
                  >
                    <Trans>Select a user from the directory</Trans>
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
                  <Trans>No users available to give access</Trans>
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
            <Button
              variant="bare"
              style={{ marginRight: 10 }}
              onPress={actions.popModal}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isDisabled={availableUsers.length === 0}
              onPress={() => onSave(close)}
            >
              {defaultUserAccess.userId ? t('Save') : t('Add')}
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
