import { useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import * as asyncStorage from 'loot-core/src/platform/server/asyncStorage';

import { useActions } from '../../hooks/useActions';
import { theme, styles } from '../../style';
import { Error } from '../alerts';
import { Button } from '../common/Button2';
import { Label } from '../common/Label';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
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

type PasswordEnableModalProps = {
  onSave?: () => void;
};

export function PasswordEnableModal({
  onSave: originalOnSave,
}: PasswordEnableModalProps) {
  const [error, setError] = useState<string | null>(null);
  const { closeBudget, popModal } = useActions();
  const multiuserEnabled = useMultiuserEnabled();
  const availableLoginMethods = useAvailableLoginMethods();
  const refreshLoginMethods = useRefreshLoginMethods();

  function getErrorMessage(error: string): string {
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

  async function onSetPassword(password: string) {
    setError(null);
    const { error } = (await send('enable-password', { password })) || {};
    if (!error) {
      originalOnSave?.();
      await refreshLoginMethods();
      await asyncStorage.removeItem('user-token');
      await closeBudget();
    } else {
      setError(getErrorMessage(error));
    }
  }

  return (
    <Modal name="enable-password-auth">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Revert to server password"
            rightContent={<ModalCloseButton onClick={close} />}
          />

          <View style={{ flexDirection: 'column' }}>
            <FormField style={{ flex: 1 }}>
              {!availableLoginMethods.some(
                login => login.method === 'password',
              ) && (
                <ConfirmPasswordForm
                  buttons={
                    <Button
                      variant="bare"
                      style={{ fontSize: 15, marginRight: 10 }}
                      onPress={() => popModal()}
                    >
                      Cancel
                    </Button>
                  }
                  onSetPassword={onSetPassword}
                  onError={(error: string) => setError(getErrorMessage(error))}
                />
              )}
              {availableLoginMethods.some(
                login => login.method === 'password',
              ) && (
                <ConfirmOldPasswordForm
                  buttons={
                    <Button
                      variant="bare"
                      style={{ fontSize: 15, marginRight: 10 }}
                      onPress={() => popModal()}
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
        </>
      )}
    </Modal>
  );
}
