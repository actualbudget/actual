import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';
import { send } from 'loot-core/platform/client/fetch';
import { getUserAccessErrors } from 'loot-core/shared/errors';

import { useActions } from '../../hooks/useActions';
import { useLocalPref } from '../../hooks/useLocalPref';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

export function TransferOwnership({ modalProps, onSave: originalOnSave }) {
  const userData = useSelector((state: State) => state.user.data);
  const actions = useActions();
  const [userId, setUserId] = useState('');
  const [error, setSetError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [cloudFileId] = useLocalPref('cloudFileId');

  useEffect(() => {
    send('users-get').then(users =>
      setAvailableUsers(
        users
          .filter(user => userData?.userId === user.id)
          .map(user => [
            user.id,
            user.displayName
              ? `${user.displayName} (${user.userName})`
              : user.userName,
          ]),
      ),
    );
  }, []);

  async function onSave() {
    const { error } =
      (await send('transfer-ownership', {
        fileId: cloudFileId,
        newUserId: userId,
      })) || {};
    if (!error) {
      originalOnSave?.();
      modalProps.onClose();
    } else {
      setSetError(getUserAccessErrors(error));
    }
  }

  return (
    <Modal
      title="Transfer ownership"
      size="medium"
      {...modalProps}
      style={{ ...modalProps.style, flex: 'inherit' }}
    >
      <Stack direction="row" style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="User" htmlFor="user-field" />
          {availableUsers.length > 0 && (
            <View>
              <Select
                options={availableUsers}
                onChange={newValue => {
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
                Select a user from the directory to designate as the new budget
                owner.
              </label>
              <label
                style={{
                  ...styles.verySmallText,
                  color: theme.pageTextLight,
                  marginTop: 5,
                }}
              >
                This action is irreversible. Only the new owner or an
                administrator can reverse it.
              </label>
              <label
                style={{
                  ...styles.verySmallText,
                  color: theme.pageTextLight,
                  marginTop: 5,
                }}
              >
                Proceed with caution.
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
              No users available
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
        <Button style={{ marginRight: 10 }} onClick={actions.popModal}>
          Cancel
        </Button>
        <Button readOnly={availableUsers.length > 0} onClick={onSave}>
          Transfer ownership
        </Button>
      </Stack>
    </Modal>
  );
}
