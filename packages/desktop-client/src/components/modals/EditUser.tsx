import { useState } from 'react';

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

function getUserDirectoryErrors(reason: string): string {
  switch (reason) {
    case 'unauthorized':
      return 'You are not logged in.';
    case 'token-expired':
      return 'Login expired, please login again.';
    case 'user-cant-be-empty':
      return 'Please enter a value for the username; the field cannot be empty.';
    case 'role-cant-be-empty':
      return 'Select a role; the field cannot be empty.';
    case 'user-already-exists':
      return 'The username you entered already exists. Please choose a different username.';
    case 'not-all-deleted':
      return 'Not all users were deleted. Check if one of the selected users is the server owner.';
    case 'role-does-not-exists':
      return 'Selected role does not exists, possibly a bug? Visit https://actualbudget.org/contact/ for support.';
    default:
      return `An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: ${reason})`;
  }
}

async function saveUser(
  method: 'user-add' | 'user-update',
  user: User,
  setError: (error: string) => void,
  actions: BoundActions,
): Promise<boolean> {
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
        title: 'Login expired',
        sticky: true,
        message: getUserDirectoryErrors(error),
        button: {
          title: 'Go to login',
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
  return (
    <Modal name="edit-user">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="User"
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
  const actions = useActions();
  const [userName, setUserName] = useState<string>(defaultUser.userName ?? '');
  const [displayName, setDisplayName] = useState<string>(
    defaultUser.displayName ?? '',
  );
  const [enabled, setEnabled] = useState<boolean>(defaultUser.enabled);
  const [role, setRole] = useState<string>(
    defaultUser.role ?? '213733c1-5645-46ad-8784-a7b20b400f93',
  );
  const [error, setError] = useState<string>('');

  async function onSave() {
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
          <FormLabel title="Username" htmlFor="name-field" />
          <Input value={userName} onChangeValue={text => setUserName(text)} />
          <label
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
              marginTop: 5,
            }}
          >
            The username registered within the OpenID provider.
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
          Change this username with caution; it is the server owner.
        </label>
      )}
      <Stack direction="row" style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Display Name" htmlFor="dispalyname-field" />
          <Input
            value={displayName}
            onChangeValue={text => setDisplayName(text)}
            placeholder="(Optional)"
          />
          <View
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
              marginTop: 5,
            }}
          >
            If left empty, it will be updated from your OpenID provider on the
            user&apos;s login, if available there.
          </View>
          <View
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
            }}
          >
            When displaying user information, this will be shown instead of the
            username.
          </View>
        </FormField>
      </Stack>
      <Stack direction="row" style={{ marginTop: 10, width: '100px' }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Role" htmlFor="name-field" />
          <Select
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
          Cancel
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
        In our user directory, each user is assigned a specific role that
        determines their permissions and capabilities within the system.
      </Text>
      <Text
        style={{
          ...styles.verySmallText,
          color: theme.pageTextLight,
        }}
      >
        Understanding these roles is essential for managing users and
        responsibilities effectively.
      </Text>
      <View style={{ paddingTop: 5 }}>
        <label
          style={{
            ...styles.altMenuHeaderText,
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          Basic
        </label>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          Users with the Basic role can create new budgets and be invited to
          collaborate on budgets created by others.
        </Text>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          This role is ideal for users who primarily need to manage their own
          budgets and participate in shared budget activities.
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
          Admin
        </label>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          Can do everything that Basic users can. In addition, they have the
          ability to add new users to the directory and access budget files from
          all users.
        </Text>
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          Also can assign ownership of a budget to another person, ensuring
          efficient budget management.
        </Text>
      </View>
    </View>
  );
};
