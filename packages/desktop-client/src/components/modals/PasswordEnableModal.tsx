import { useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import { getOpenIdErrors } from 'loot-core/shared/errors';

import { useActions } from '../../hooks/useActions';

import { OpenIdConfig, OpenIdForm } from '../manager/subscribe/OpenIdForm';
import { theme, styles } from '../../style';
import { View } from '../common/View';
import { Button } from '../common/Button';
import * as asyncStorage from '../../../../loot-core/src/platform/server/asyncStorage';
import { Title } from '../manager/subscribe/common';
import { Text } from '../common/Text';
import { ConfirmPasswordForm } from '../manager/subscribe/ConfirmPasswordForm';
import { useNavigate } from '../../hooks/useNavigate';
import { Modal } from '../common/Modal';
import { Stack } from '../common/Stack';
import { FormField } from '../forms';
import { Error } from '../alerts';
import { Label } from '../common/Label';

export function PasswordEnableModal({ modalProps, onSave: originalOnSave }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const actions = useActions();
  const { closeBudget } = useActions();

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return 'Password cannot be empty';
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
      <View style={{flexDirection:'column'}}>
        <FormField style={{ flex: 1 }}>
          <ConfirmPasswordForm
            buttons={
              <Button
                type="bare"
                style={{ fontSize: 15, marginRight: 10 }}
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
            }
            onSetPassword={onSetPassword}
            onError={error => setError(getErrorMessage(error))}
          />
        </FormField>
        <Label
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
            paddingTop: 5,
          }}
          title="After disabling openid all sessions will be closed"
        />
        <Label
          style={{
            ...styles.verySmallText,
            color: theme.warningText,
          }}
          title="Multi-user will not work after disabling"
        />
        {error && (<Error>{error}</Error>)}
      </View>
    </Modal>
  );
}
