import { useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import * as asyncStorage from '../../../../loot-core/src/platform/server/asyncStorage';
import { useActions } from '../../hooks/useActions';
import { theme, styles } from '../../style';
import { Error } from '../alerts';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { FormField } from '../forms';
import {
  ConfirmOldPasswordForm,
  ConfirmPasswordForm,
} from '../manager/subscribe/ConfirmPasswordForm';
import {
  useAvailableLoginMethods,
  useMultiuserEnabled,
  useRefreshLoginMethods,
} from '../ServerContext';

export function PasswordEnableModal({ modalProps, onSave: originalOnSave }) {
  const [error, setError] = useState('');
  const { closeBudget, popModal } = useActions();
  const multiuserEnabled = useMultiuserEnabled();
  const availableLoginMethods = useAvailableLoginMethods();
  const refreshLoginMethods = useRefreshLoginMethods();

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return 'Invalid Password';
      case 'password-match':
        return 'Passwords do not match';
      case 'network-failure':
        return 'Unable to contact the server';
      case 'unable-to-change-file-config-enabled':
        return 'Unable to disable OpenID. Please update the config.json file in this case.';
      default:
        return 'Internal server error';
    }
  }

  async function onSetPassword(password) {
    setError(null);
    const { error } = (await send('enable-password', { password })) || {};
    if (!error) {
      originalOnSave?.();
      modalProps.onClose();
      await refreshLoginMethods();
      await asyncStorage.removeItem('user-token');
      await closeBudget();
    } else {
      setError(getErrorMessage(error));
    }
  }

  return (
    <Modal
      title="Revert to server password"
      size="medium"
      {...modalProps}
      style={{ ...modalProps.style, flex: 'inherit' }}
    >
      <View style={{ flexDirection: 'column' }}>
        <FormField style={{ flex: 1 }}>
          {!availableLoginMethods.some(
            login => login.method === 'password',
          ) && (
            <ConfirmPasswordForm
              buttons={
                <Button
                  type="bare"
                  style={{ fontSize: 15, marginRight: 10 }}
                  onClick={() => popModal()}
                >
                  Cancel
                </Button>
              }
              onSetPassword={onSetPassword}
              onError={error => setError(getErrorMessage(error))}
            />
          )}
          {availableLoginMethods.some(login => login.method === 'password') && (
            <ConfirmOldPasswordForm
              buttons={
                <Button
                  type="bare"
                  style={{ fontSize: 15, marginRight: 10 }}
                  onClick={() => popModal()}
                >
                  Cancel
                </Button>
              }
              onSetPassword={onSetPassword}
            />
          )}
        </FormField>
        <Label
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
            paddingTop: 5,
          }}
          title="After disabling openid all sessions will be closed"
        />
        {multiuserEnabled && (
          <Label
            style={{
              ...styles.verySmallText,
              color: theme.warningText,
            }}
            title="Multi-user will not work after disabling"
          />
        )}
        {error && <Error>{error}</Error>}
      </View>
    </Modal>
  );
}
