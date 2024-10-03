// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { send } from 'loot-core/src/platform/client/fetch';

import { useNavigate } from '../../../hooks/useNavigate';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';

export function ChangePassword() {
  const { t } = useTranslation();

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
      setMessage(t('Password successfully changed'));
      await send('subscribe-sign-in', { password });
      navigate('/');
    }
  }

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text={t('Change server password')} />
      <Text
        style={{
          fontSize: 16,
          color: theme.pageTextDark,
          lineHeight: 1.4,
        }}
      >
        <Trans>
          This will change the password for this server instance. All existing
          sessions will stay logged in.
        </Trans>
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
            style={{ fontSize: 15, marginRight: 10 }}
            onPress={() => navigate('/')}
          >
            <Trans>Cancel</Trans>
          </Button>
        }
        onSetPassword={onSetPassword}
        onError={setError}
      />
    </View>
  );
}
