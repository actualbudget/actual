// @ts-strict-ignore
import React, { useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { useNavigate } from '../../../hooks/useNavigate';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';

export function ChangePassword() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [msg, setMessage] = useState(null);

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
    const { error } = await send('subscribe-change-password', { password });

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
            color: theme.noticeTextLight,
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
            variant="bare"
            aria-label="Cancel"
            style={{ fontSize: 15, marginRight: 10 }}
            onPress={() => navigate('/')}
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
