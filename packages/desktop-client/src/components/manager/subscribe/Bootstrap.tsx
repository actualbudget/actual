// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

import { createBudget } from '#budgetfiles/budgetfilesSlice';
import { Link } from '#components/common/Link';
import { useRefreshLoginMethods } from '#components/ServerContext';
import { useNavigate } from '#hooks/useNavigate';
import { useDispatch } from '#redux';

import { Title, useBootstrapped } from './common';
import { ConfirmPasswordForm } from './ConfirmPasswordForm';
import { WebAuthnRegistration } from './WebAuthnRegistration';

export function Bootstrap() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const [method, setMethod] = useState<'password' | 'webauthn' | null>(null);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const refreshLoginMethods = useRefreshLoginMethods();

  const { checked } = useBootstrapped();
  const navigate = useNavigate();

  useEffect(() => {
    setWebauthnSupported(browserSupportsWebAuthn());
  }, []);

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
      case 'already-bootstrapped':
        return t('This server has already been set up');
      case 'webauthn-not-supported':
        return t('Passkeys are not supported in this browser');
      case 'webauthn-ceremony-failed':
      case 'verification-failed':
      case 'invalid-or-expired-challenge':
      case 'invalid-response':
        return t('Your passkey could not be registered. Please try again');
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
      void navigate('/login');
    }
  }

  async function onWebAuthnRegistered() {
    await refreshLoginMethods();
    void navigate('/login');
  }

  async function onDemo() {
    await dispatch(createBudget({ demoMode: true }));
  }

  if (!checked) {
    return null;
  }

  const demoButton = (
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
  );

  return (
    <View style={{ maxWidth: 450 }}>
      <Title text={t('Welcome to Actual!')} />
      <Paragraph style={{ fontSize: 16, color: theme.pageTextDark }}>
        <Trans>
          Actual is a super fast privacy-focused app for managing your finances.
          To secure your data, you'll need to set a password or register a
          passkey for your server.
        </Trans>
      </Paragraph>

      <Paragraph isLast style={{ fontSize: 16, color: theme.pageTextDark }}>
        <Trans>
          Consider opening{' '}
          <Link variant="external" to="https://actualbudget.org/docs/tour/">
            our tour
          </Link>{' '}
          in a new tab for some guidance on what to do when you've set up your
          login.
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

      {method === null && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: 30,
            gap: '1rem',
          }}
        >
          {demoButton}
          <Button variant="normal" onPress={() => setMethod('password')}>
            <Trans>Use a password</Trans>
          </Button>
          <Button
            variant="primary"
            isDisabled={!webauthnSupported}
            onPress={() => setMethod('webauthn')}
          >
            <Trans>Register a passkey</Trans>
          </Button>
        </View>
      )}

      {method === 'password' && (
        <ConfirmPasswordForm
          buttons={demoButton}
          onSetPassword={onSetPassword}
          onError={setError}
        />
      )}

      {method === 'webauthn' && (
        <WebAuthnRegistration
          buttons={demoButton}
          onRegistered={onWebAuthnRegistered}
          onError={setError}
        />
      )}
    </View>
  );
}
