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

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import {
  type Modal as ModalType,
  popModal,
} from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { signOut } from '@desktop-client/users/usersSlice';

type EditUserAccessProps = Extract<
  ModalType,
  { name: 'edit-access' }
>['options'];

export function EditUserAccess({
  access: defaultUserAccess,
  onSave: originalOnSave,
}: EditUserAccessProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [userId, setUserId] = useState(defaultUserAccess.userId ?? '');
  const [error, setSetError] = useState('');
  const [availableUsers, setAvailableUsers] = useState<[string, string][]>([]);

  useEffect(() => {
    send('access-get-available-users', defaultUserAccess.fileId).then(data => {
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
    });
  }, [defaultUserAccess.fileId]);

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
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              id: 'login-expired',
              title: t('Login expired'),
              sticky: true,
              message: getUserAccessErrors(error),
              button: {
                title: t('Go to login'),
                action: () => {
                  dispatch(signOut());
                },
              },
            },
          }),
        );
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
          <SpaceBetween style={{ marginTop: 10 }}>
            <FormField style={{ flex: 1 }}>
              <FormLabel title={t('User')} htmlFor="user-field" />
              {availableUsers.length > 0 && (
                <View>
                  <Select
                    options={availableUsers}
                    onChange={(newValue: string) => setUserId(newValue)}
                    value={userId}
                  />
                  <Text
                    style={{
                      ...styles.verySmallText,
                      color: theme.pageTextLight,
                      marginTop: 5,
                    }}
                  >
                    <Trans>Select a user from the directory</Trans>
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
                  <Trans>No users available to give access</Trans>
                </Text>
              )}
            </FormField>
          </SpaceBetween>

          <SpaceBetween
            gap={10}
            style={{
              marginTop: 20,
              justifyContent: 'flex-end',
            }}
          >
            {error && <Text style={{ color: theme.errorText }}>{error}</Text>}
            <Button variant="bare" onPress={() => dispatch(popModal())}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              isDisabled={availableUsers.length === 0}
              onPress={() => onSave(close)}
            >
              {defaultUserAccess.userId ? t('Save') : t('Add')}
            </Button>
          </SpaceBetween>
        </>
      )}
    </Modal>
  );
}
