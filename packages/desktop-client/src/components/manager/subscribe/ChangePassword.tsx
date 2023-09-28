import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { send } from 'loot-core/src/platform/client/fetch';

import { theme } from '../../../style';
import Button from '../../common/Button';
import Text from '../../common/Text';
import View from '../../common/View';

import { Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';

export default function ChangePassword() {
  let navigate = useNavigate();
  let [error, setError] = useState(null);
  let [msg, setMessage] = useState(null);

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return 'Password cannot be empty';
      case 'password-match':
        return 'Passwords do not match';
      case 'network-failure':
        return 'Unable to contact the server';
      default:
        return 'Internal server error';
    }
  }

  async function onSetPassword(password) {
    setError(null);
    let { error } = await send('subscribe-change-password', { password });

    if (error) {
      setError(error);
    } else {
      setMessage('Password successfully changed');
      await send('subscribe-sign-in', { password });
      navigate('/');
    }
  }

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text="Change server password" />
      <Text
        style={{
          fontSize: 16,
          color: theme.pageTextDark,
          lineHeight: 1.4,
        }}
      >
        This will change the password for this server instance. All existing
        sessions will stay logged in.
      </Text>

      {error && (
        <Text
          style={{
            marginTop: 20,
            color: theme.errorText,
            borderRadius: 4,
            fontSize: 15,
          }}
        >
          {getErrorMessage(error)}
        </Text>
      )}

      {msg && (
        <Text
          style={{
            marginTop: 20,
            color: theme.noticeText,
            borderRadius: 4,
            fontSize: 15,
          }}
        >
          {msg}
        </Text>
      )}

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
        onError={setError}
      />
    </View>
  );
}
