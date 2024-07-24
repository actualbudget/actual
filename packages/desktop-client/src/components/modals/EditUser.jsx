import { useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import { getUserDirectoryErrors } from 'loot-core/shared/errors';

import { useActions } from '../../hooks/useActions';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox, FormField, FormLabel } from '../forms';

export function EditUser({ modalProps, defaultUser, onSave: originalOnSave }) {
  const actions = useActions();
  const [userName, setUserName] = useState(defaultUser.userName ?? '');
  const [displayName, setDisplayName] = useState(defaultUser.displayName ?? '');
  const [enabled, setEnabled] = useState(defaultUser.enabled);
  const [role, setRole] = useState(
    defaultUser.value ?? 'e87fa1f1-ac8c-4913-b1b5-1096bdb1eacc',
  );
  const [error, setError] = useState('');

  async function onSave() {
    const user = {
      ...defaultUser,
      userName,
      displayName,
      enabled,
      role,
    };

    const method = user.id ? 'user-update' : 'user-add';
    const { error, id: newId } = (await send(method, user)) || {};
    if (!error) {
      if (newId) {
        user.id = newId;
      }

      originalOnSave?.(user);
      modalProps.onClose();
    } else {
      setError(getUserDirectoryErrors(error));
      actions.addNotification({
        type: error === 'token-expired' ? 'error' : 'warning',
        title: 'Something wrong happened',
        sticky: true,
        message: getUserDirectoryErrors(error),
        button: {
          title: 'Go to login',
          action: () => {
            actions.popModal();
            actions.goToLoginFromManagement();
          },
        },
      });
    }
  }

  const possibleRoles = [
    ['213733c1-5645-46ad-8784-a7b20b400f93', 'Admin'],
    ['e87fa1f1-ac8c-4913-b1b5-1096bdb1eacc', 'Basic'],
  ];

  return (
    <Modal
      title="User"
      size="medium"
      {...modalProps}
      style={{ ...modalProps.style, flex: 'inherit' }}
    >
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
            justifyContent: 'flex-end',
          }}
        >
          {' '}
          <Checkbox
            id="name-field"
            checked={enabled}
            onChange={() => setEnabled(!enabled)}
          />
          <label
            htmlFor="form_posts_transaction"
            style={{ userSelect: 'none' }}
          >
            Enabled
          </label>
        </View>
      </Stack>
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
            options={possibleRoles}
            value={role}
            onChange={newValue => setRole(newValue)}
            buttonStyle={{ color: theme.pageTextPositive }}
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
        <Button style={{ marginRight: 10 }} onClick={actions.popModal}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave}>
          {defaultUser.id ? 'Save' : 'Add'}
        </Button>
      </Stack>
    </Modal>
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
