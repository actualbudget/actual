// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { send } from 'loot-core/src/platform/client/fetch';

import { useNavigate } from '../../../hooks/useNavigate';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Link } from '../../common/Link';
import { Paragraph } from '../../common/Paragraph';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { useRefreshLoginMethods } from '../../ServerContext';

import { useBootstrapped, Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';
import { type OpenIdConfig, OpenIdForm } from './OpenIdForm';

export function Bootstrap() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const [loginMethod, setLoginMethod] = useState('password');
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
        return 'OpenID server cannot be empty';
      case 'missing-client-id':
        return 'Client ID cannot be empty';
      case 'missing-client-secret':
        return 'Client secret cannot be empty';
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

  async function onSetOpenId(config: OpenIdConfig) {
    setError(null);
    const { error } = await send('subscribe-bootstrap', { openid: config });

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

      {loginMethod === 'password' && (
        <>
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
          <Button
            style={{ fontSize: 15, color: theme.pageTextLink, marginTop: 10 }}
            onPress={() => setLoginMethod('openid')}
            variant="normal"
          >
            Configure OpenID authentication instead (Advanced)
          </Button>
        </>
      )}

      {loginMethod === 'openid' && (
        <>
          <OpenIdForm onSetOpenId={onSetOpenId} />
          <Button
            style={{ fontSize: 15, color: theme.pageTextLink, marginTop: 10 }}
            variant="normal"
            onPress={() => setLoginMethod('password')}
          >
            Configure password authentication instead
          </Button>
        </>
      )}
    </View>
  );
}
