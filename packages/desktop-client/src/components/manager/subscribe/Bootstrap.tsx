// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';

import { useBootstrapped, Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';

import { createBudget } from '@desktop-client/budgets/budgetsSlice';
import { Link } from '@desktop-client/components/common/Link';
import { useRefreshLoginMethods } from '@desktop-client/components/ServerContext';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useDispatch } from '@desktop-client/redux';

export function Bootstrap() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const refreshLoginMethods = useRefreshLoginMethods();

  const { checked } = useBootstrapped();
  const navigate = useNavigate();

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return t('Password cannot be empty');
      case 'password-match':
        return t('Passwords do not match');
      case 'network-failure':
        return t('Unable to contact the server');
      case 'missing-issuer':
        return t('OpenID server cannot be empty');
      case 'missing-client-id':
        return t('Client ID cannot be empty');
      case 'missing-client-secret':
        return t('Client secret cannot be empty');
      default:
        return t(`An unknown error occurred: {{error}}`, { error });
    }
  }

  async function onSetPassword(password) {
    setError(null);
    const { error } = await send('subscribe-bootstrap', { password });

    if (error) {
      setError(error);
    } else {
      await refreshLoginMethods();
      navigate('/login');
    }
  }

  async function onDemo() {
    await dispatch(createBudget({ demoMode: true }));
  }

  if (!checked) {
    return null;
  }

  return (
    <View style={{ maxWidth: 450 }}>
      <Title text={t('Welcome to Actual!')} />
      <Paragraph style={{ fontSize: 16, color: theme.pageTextDark }}>
        <Trans>
          Actual is a super fast privacy-focused app for managing your finances.
          To secure your data, you’ll need to set a password for your server.
        </Trans>
      </Paragraph>

      <Paragraph isLast style={{ fontSize: 16, color: theme.pageTextDark }}>
        <Trans>
          Consider opening{' '}
          <Link variant="external" to="https://actualbudget.org/docs/tour/">
            our tour
          </Link>{' '}
          in a new tab for some guidance on what to do when you’ve set your
          password.
        </Trans>
      </Paragraph>

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

      <ConfirmPasswordForm
        buttons={
          <Button
            variant="bare"
            style={{
              fontSize: 15,
              color: theme.pageTextLink,
              marginRight: 15,
            }}
            onPress={onDemo}
          >
            {t('Try Demo')}
          </Button>
        }
        onSetPassword={onSetPassword}
        onError={setError}
      />
    </View>
  );
}
