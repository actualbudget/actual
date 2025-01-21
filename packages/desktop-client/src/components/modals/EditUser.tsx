import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  type Modal as ModalType,
  popModal,
} from 'loot-core/client/modals/modalsSlice';
import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import { signOut } from 'loot-core/client/users/usersSlice';
import { send } from 'loot-core/platform/client/fetch';
import {
  type NewUserEntity,
  PossibleRoles,
  type UserEntity,
} from 'loot-core/src/types/models/user';

import { useDispatch } from '../../redux';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox, FormField, FormLabel } from '../forms';

type User = UserEntity;
type NewUser = NewUserEntity;

function useGetUserDirectoryErrors() {
  const { t } = useTranslation();

  function getUserDirectoryErrors(reason: string) {
    switch (reason) {
      case 'unauthorized':
        return t('You are not logged in.');
      case 'token-expired':
        return t('Login expired, please log in again.');
      case 'user-cant-be-empty':
        return t(
          'Please enter a value for the username; the field cannot be empty.',
        );
      case 'role-cant-be-empty':
        return t('Select a role; the field cannot be empty.');
      case 'user-already-exists':
        return t(
          'The username you entered already exists. Please choose a different username.',
        );
      case 'not-all-deleted':
        return t(
          'Not all users were deleted. Check if one of the selected users is the server owner.',
        );
      case 'role-does-not-exists':
        return t(
          'Selected role does not exists, possibly a bug? Visit https://actualbudget.org/contact/ for support.',
        );
      default:
        return t(
          'An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: {{reason}})',
          { reason },
        );
    }
  }

  return { getUserDirectoryErrors };
}

function useSaveUser() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { getUserDirectoryErrors } = useGetUserDirectoryErrors();

  async function saveUser(
    method: 'user-add' | 'user-update',
    user: User,
    setError: (error: string) => void,
  ): Promise<boolean> {
    const res = await send(method, user);
    if (!('error' in res)) {
      const newId = res.id;
      if (newId) {
        user.id = newId;
      }
    } else {
      const error = res.error;
      setError(getUserDirectoryErrors(error));
      if (error === 'token-expired') {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              id: 'login-expired',
              title: t('Login expired'),
              sticky: true,
              message: getUserDirectoryErrors(error),
              button: {
                title: t('Go to login'),
                action: () => {
                  dispatch(signOut());
                },
              },
            },
          }),
        );
      }

      return false;
    }

    return true;
  }

  return { saveUser };
}

type EditUserFinanceAppProps = Extract<
  ModalType,
  { name: 'edit-user' }
>['options'];

export function EditUserFinanceApp({
  user: defaultUser,
  onSave: originalOnSave,
}: EditUserFinanceAppProps) {
  const { t } = useTranslation();
  const { saveUser } = useSaveUser();
  const isExistingUser = 'id' in defaultUser && !!defaultUser.id;
  return (
    <Modal name="edit-user">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              isExistingUser
                ? t('Edit user {{userName}}', {
                    userName: defaultUser.displayName ?? defaultUser.userName,
                  })
                : 'Add user'
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <EditUser
            defaultUser={defaultUser}
            onSave={async (method, user, setError) => {
              if (await saveUser(method, user, setError)) {
                originalOnSave(user);
                close();
              }
            }}
          />
        </>
      )}
    </Modal>
  );
}

type EditUserProps = {
  defaultUser: User | NewUser;
  onSave: (
    method: 'user-add' | 'user-update',
    user: User,
    setError: (error: string) => void,
  ) => Promise<void>;
};

function EditUser({ defaultUser, onSave: originalOnSave }: EditUserProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isExistingUser = 'id' in defaultUser && !!defaultUser.id;
  const isOwner = 'owner' in defaultUser && defaultUser.owner;

  const [userName, setUserName] = useState<string>(defaultUser.userName ?? '');
  const [displayName, setDisplayName] = useState<string>(
    defaultUser.displayName ?? '',
  );
  const [enabled, setEnabled] = useState<boolean>(defaultUser.enabled);
  const [role, setRole] = useState<string>(defaultUser.role ?? 'BASIC');
  const [error, setError] = useState<string>('');

  async function onSave() {
    if (!userName.trim()) {
      setError(t('Username is required.'));
      return;
    }
    if (!role) {
      setError(t('Role is required.'));
      return;
    }
    const user: User = {
      ...defaultUser,
      id: isExistingUser ? defaultUser.id : '',
      owner: isOwner,
      userName,
      displayName,
      enabled,
      role,
    };

    const method = isExistingUser ? 'user-update' : 'user-add';
    await originalOnSave(method, user, setError);
  }

  return (
    <>
      <Stack direction="row" style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Username')} htmlFor="name-field" />
          <Input
            id="name-field"
            value={userName}
            onChangeValue={text => setUserName(text)}
            style={{
              borderColor: theme.buttonMenuBorder,
            }}
          />
          <label
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
              marginTop: 5,
            }}
          >
            <Trans>The username registered within the OpenID provider.</Trans>
          </label>
        </FormField>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            userSelect: 'none',
          }}
        >
          {' '}
          <Checkbox
            id="enabled-field"
            checked={enabled}
            disabled={isOwner}
            style={{
              color: isOwner ? theme.pageTextSubdued : 'inherit',
            }}
            onChange={() => setEnabled(!enabled)}
          />
          <label htmlFor="enabled-field" style={{ userSelect: 'none' }}>
            Enabled
          </label>
        </View>
      </Stack>
      {isOwner && (
        <label
          style={{
            ...styles.verySmallText,
            color: theme.errorText,
            marginTop: 5,
          }}
        >
          <Trans>
            Change this username with caution; it is the server owner.
          </Trans>
        </label>
      )}
      <Stack direction="row" style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Display Name')} htmlFor="displayname-field" />
          <Input
            id="displayname-field"
            value={displayName}
            onChangeValue={text => setDisplayName(text)}
            placeholder={t('(Optional)')}
            style={{
              borderColor: theme.buttonMenuBorder,
            }}
          />
          <View
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
              marginTop: 5,
            }}
          >
            <Trans>
              If left empty, it will be updated from your OpenID provider on the
              user&apos;s login, if available there.
            </Trans>
          </View>
          <View
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
            }}
          >
            <Trans>
              When displaying user information, this will be shown instead of
              the username.
            </Trans>
          </View>
        </FormField>
      </Stack>
      <Stack direction="row" style={{ marginTop: 10, width: '100px' }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Role" htmlFor="role-field" />
          <Select
            id="role-field"
            disabled={isOwner}
            options={Object.entries(PossibleRoles)}
            value={role}
            onChange={newValue => setRole(newValue)}
            style={{
              borderColor: theme.buttonMenuBorder,
            }}
          />
        </FormField>
      </Stack>
      <RoleDescription />

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
          onPress={() => dispatch(popModal())}
        >
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" onPress={onSave}>
          {isExistingUser ? 'Save' : 'Add'}
        </Button>
      </Stack>
    </>
  );
}

const RoleDescription = () => {
  return (
    <View style={{ paddingTop: 10 }}>
      <Text
        style={{
          ...styles.verySmallText,
          color: theme.pageTextLight,
        }}
      >
        <Trans>
          In our user directory, each user is assigned a specific role that
          determines their permissions and capabilities within the system.
        </Trans>
      </Text>
      <Text
        style={{
          ...styles.verySmallText,
          color: theme.pageTextLight,
        }}
      >
        <Trans>
          Understanding these roles is essential for managing users and
          responsibilities effectively.
        </Trans>
      </Text>
      <View style={{ paddingTop: 5 }}>
        <label
          style={{
            ...styles.altMenuHeaderText,
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          <Trans>Basic</Trans>
        </label>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          <Trans>
            Users with the Basic role can create new budgets and be invited to
            collaborate on budgets created by others.
          </Trans>
        </Text>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          <Trans>
            This role is ideal for users who primarily need to manage their own
            budgets and participate in shared budget activities.
          </Trans>
        </Text>
      </View>
      <View style={{ paddingTop: 10 }}>
        <label
          style={{
            ...styles.altMenuHeaderText,
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          <Trans>Admin</Trans>
        </label>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          <Trans>
            Can do everything that Basic users can. In addition, they have the
            ability to add new users to the directory and access budget files
            from all users.
          </Trans>
        </Text>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          <Trans>
            Can also assign ownership of a budget to another person, ensuring
            efficient budget management.
          </Trans>
        </Text>
      </View>
    </View>
  );
};
