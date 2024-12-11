import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/fetch';
import {
  PossibleRoles,
  type UserEntity,
} from 'loot-core/src/types/models/user';

import { type BoundActions, useActions } from '../../hooks/useActions';
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

type EditUserProps = {
  defaultUser: User;
  onSave: (
    method: 'user-add' | 'user-update',
    user: User,
    setError: (error: string) => void,
    actions: BoundActions,
  ) => Promise<void>;
};

type EditUserFinanceAppProps = {
  defaultUser: User;
  onSave: (user: User) => void;
};

function useGetUserDirectoryErrors() {
  const { t } = useTranslation();

  function getUserDirectoryErrors(reason) {
    switch (reason) {
      case 'unauthorized':
        return t('You are not logged in.');
      case 'token-expired':
        return t('Login expired, please login again.');
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

async function saveUser(
  method: 'user-add' | 'user-update',
  user: User,
  setError: (error: string) => void,
  actions: BoundActions,
): Promise<boolean> {
  const { t } = useTranslation();

  const { getUserDirectoryErrors } = useGetUserDirectoryErrors();

  const { error, id: newId } = (await send(method, user)) || {};
  if (!error) {
    if (newId) {
      user.id = newId;
    }
  } else {
    setError(getUserDirectoryErrors(error));
    if (error === 'token-expired') {
      actions.addNotification({
        type: 'error',
        id: 'login-expired',
        title: t('Login expired'),
        sticky: true,
        message: getUserDirectoryErrors(error),
        button: {
          title: t('Go to login'),
          action: () => {
            actions.signOut();
          },
        },
      });
    }

    return false;
  }

  return true;
}

export function EditUserFinanceApp({
  defaultUser,
  onSave: originalOnSave,
}: EditUserFinanceAppProps) {
  const { t } = useTranslation();

  return (
    <Modal name="edit-user">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('User')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <EditUser
            defaultUser={defaultUser}
            onSave={async (method, user, setError, actions) => {
              if (await saveUser(method, user, setError, actions)) {
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

function EditUser({ defaultUser, onSave: originalOnSave }: EditUserProps) {
  const { t } = useTranslation();

  const actions = useActions();
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
      userName,
      displayName,
      enabled,
      role,
    };

    const method = user.id ? 'user-update' : 'user-add';
    await originalOnSave(method, user, setError, actions);
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
            disabled={defaultUser.owner}
            style={{
              color: defaultUser.owner ? theme.pageTextSubdued : 'inherit',
            }}
            onChange={() => setEnabled(!enabled)}
          />
          <label htmlFor="enabled-field" style={{ userSelect: 'none' }}>
            Enabled
          </label>
        </View>
      </Stack>
      {defaultUser.owner && (
        <label
          style={{
            ...styles.verySmallText,
            color: theme.warningTextLight,
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
            disabled={defaultUser.owner}
            options={Object.entries(PossibleRoles)}
            value={role}
            onChange={newValue => setRole(newValue)}
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
          onPress={actions.popModal}
        >
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" onPress={onSave}>
          {defaultUser.id ? 'Save' : 'Add'}
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
            Also can assign ownership of a budget to another person, ensuring
            efficient budget management.
          </Trans>
        </Text>
      </View>
    </View>
  );
};
