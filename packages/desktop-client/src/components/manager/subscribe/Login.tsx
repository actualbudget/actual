// @ts-strict-ignore
import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';

import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { theme } from '../../../style';
import { Button, ButtonWithLoading } from '../../common/Button2';
import { BigInput } from '../../common/Input';
import { Link } from '../../common/Link';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { useBootstrapped, Title } from './common';

export function Login() {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const { method = 'password' } = useParams();
  const [searchParams, _setSearchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get('error'));
  const { checked } = useBootstrapped(!searchParams.has('error'));

  useEffect(() => {
    if (checked && !searchParams.has('error')) {
      (async () => {
        if (method === 'header') {
          setError(null);
          setLoading(true);
          const { error } = await send('subscribe-sign-in', {
            password: '',
            loginMethod: method,
          });
          setLoading(false);

          if (error) {
            setError(error);
          } else {
            dispatch(loggedIn());
          }
        }
      })();
    }
  }, [checked, searchParams, method, dispatch]);

  function getErrorMessage(error) {
    switch (error) {
      case 'invalid-header':
        return 'Auto login failed - No header sent';
      case 'proxy-not-trusted':
        return 'Auto login failed - Proxy not trusted';
      case 'invalid-password':
        return 'Invalid password';
      case 'network-failure':
        return 'Unable to contact the server';
      default:
        return `An unknown error occurred: ${error}`;
    }
  }

  async function onSubmit() {
    if (password === '' || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = await send('subscribe-sign-in', {
      password,
      loginMethod: method,
    });
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      dispatch(loggedIn());
    }
  }

  async function onDemo() {
    await dispatch(createBudget({ demoMode: true }));
  }

  if (!checked) {
    return null;
  }

  return (
    <View style={{ maxWidth: 450, marginTop: -30, color: theme.pageText }}>
      <Title text={t('Sign in to this Actual instance')} />
      <Text
        style={{
          fontSize: 16,
          color: theme.pageTextDark,
          lineHeight: 1.4,
        }}
      >
        <Trans>
          If you lost your password, you likely still have access to your server
          to manually reset it.
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

      {method === 'password' && (
        <View style={{ display: 'flex', flexDirection: 'row', marginTop: 30 }}>
          <BigInput
            autoFocus={true}
            placeholder={t('Password')}
            type="password"
            onChangeValue={setPassword}
            style={{ flex: 1, marginRight: 10 }}
            onEnter={onSubmit}
          />
          <ButtonWithLoading
            variant="primary"
            isLoading={loading}
            style={{ fontSize: 15 }}
            onPress={onSubmit}
          >
            <Trans>Sign in</Trans>
          </ButtonWithLoading>
        </View>
      )}
      {method === 'header' && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 15,
          }}
        >
          {error && (
            <Link
              variant="button"
              buttonVariant="primary"
              style={{ fontSize: 15 }}
              to={'/login/password?error=' + error}
            >
              <Trans>Login with Password</Trans>
            </Link>
          )}
          {!error && (
            <span>
              <Trans>Checking Header Token Login ...</Trans>{' '}
              <AnimatedLoading style={{ width: 20, height: 20 }} />
            </span>
          )}
        </View>
      )}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 15,
        }}
      >
        <Button
          variant="bare"
          style={{ fontSize: 15, color: theme.pageTextLink, marginLeft: 10 }}
          onPress={onDemo}
        >
          <Trans>Try Demo &rarr;</Trans>
        </Button>
      </View>
    </View>
  );
}
