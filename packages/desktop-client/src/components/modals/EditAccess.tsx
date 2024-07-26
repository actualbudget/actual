import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import { getUserAccessErrors } from 'loot-core/shared/errors';

import { useActions } from '../../hooks/useActions';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

export function EditUserAccess({ defaultUserAccess, onSave: originalOnSave }) {
  const actions = useActions();
  const [userId, setUserId] = useState(defaultUserAccess.userId ?? '');
  const [error, setSetError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    send('access-get-available-users', defaultUserAccess.fileId).then(users =>
      setAvailableUsers(
        users.map(user => [
          user.userId,
          user.displayName
            ? `${user.displayName} (${user.userName})`
            : user.userName,
        ]),
      ),
    );
  }, [defaultUserAccess.fileId]);

  async function onSave() {
    const userAccess = {
      ...defaultUserAccess,
      userId,
    };

    const { error } = await send('access-add', userAccess);
    if (!error) {
      originalOnSave?.(userAccess);
    } else {
      setSetError(getUserAccessErrors(error));
    }
  }

  return (
    <Modal name="User Access">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="User Access"
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <Stack direction="row" style={{ marginTop: 10 }}>
            <FormField style={{ flex: 1 }}>
              <FormLabel title="User" htmlFor="user-field" />
              {availableUsers.length > 0 && (
                <View>
                  <Select
                    options={availableUsers}
                    onChange={newValue => setUserId(newValue)}
                    value={userId}
                  />
                  <label
                    style={{
                      ...styles.verySmallText,
                      color: theme.pageTextLight,
                      marginTop: 5,
                    }}
                  >
                    Select an user from the directory
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
                  No users available to give access
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
              isDisabled={availableUsers.length > 0}
              onPress={onSave}
            >
              {defaultUserAccess.id ? 'Save' : 'Add'}
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
