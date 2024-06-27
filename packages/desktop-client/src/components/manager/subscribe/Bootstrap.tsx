// @ts-strict-ignore
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { send } from 'loot-core/src/platform/client/fetch';

import { useNavigate } from '../../../hooks/useNavigate';
import { theme } from '../../../style';
import { Button } from '../../common/Button';
import { Link } from '../../common/Link';
import { Paragraph } from '../../common/Paragraph';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { useBootstrapped, Title } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';
import { OpenIdConfig, OpenIdForm } from './OpenIdForm';

export function Bootstrap() {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const [loginMethod, setLoginMethod] = useState('password');

  const { checked } = useBootstrapped();
  const navigate = useNavigate();

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-password':
        return 'Password cannot be empty';
      case 'password-match':
        return 'Passwords do not match';
      case 'network-failure':
        return 'Unable to contact the server';
      case 'missing-issuer':
        return 'OpenID server cannot be empty';
      case 'missing-client-id':
        return 'Client ID cannot be empty';
      case 'missing-client-secret':
        return 'Client secret cannot be empty';
      default:
        return `An unknown error occurred: ${error}`;
    }
  }

  async function onSetPassword(password) {
    setError(null);
    const { error } = await send('subscribe-bootstrap', { password });

    if (error) {
      setError(error);
    } else {
      navigate('/login');
    }
  }

  async function onSetOpenId(config: OpenIdConfig) {
    setError(null);
    const { error } = await send('subscribe-bootstrap', { openid: config });

    if (error) {
      setError(error);
    } else {
      navigate('/login/openid');
    }
  }

  async function onDemo() {
    await dispatch(createBudget({ demoMode: true }));
  }

  if (!checked) {
    return null;
  }

  return (
    <View style={{ maxWidth: 450, marginTop: -30 }}>
      <Title text="Welcome to Actual!" />
      <Paragraph style={{ fontSize: 16, color: theme.pageTextDark }}>
        Actual is a super fast privacy-focused app for managing your finances.
        To secure your data, you’ll need to set a password for your server.
      </Paragraph>

      <Paragraph isLast style={{ fontSize: 16, color: theme.pageTextDark }}>
        Consider opening{' '}
        <Link variant="external" to="https://actualbudget.org/docs/tour/">
          our tour
        </Link>{' '}
        in a new tab for some guidance on what to do when you’ve set your
        password.
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
                type="bare"
                style={{
                  fontSize: 15,
                  color: theme.pageTextLink,
                  marginRight: 15,
                }}
                onClick={onDemo}
              >
                Try Demo
              </Button>
            }
            onSetPassword={onSetPassword}
            onError={setError}
          />
          <Button
            style={{ marginTop: 10 }}
            onClick={() => setLoginMethod('openid')}
          >
            Configure OpenID authentication instead (Advanced)
          </Button>
        </>
      )}

      {loginMethod === 'openid' && (
        <>
          <OpenIdForm onSetOpenId={onSetOpenId} />
          <Button
            style={{ marginTop: 10 }}
            onClick={() => setLoginMethod('password')}
          >
            Configure password authentication instead
          </Button>
        </>
      )}
    </View>
);
}
