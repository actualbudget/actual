// @ts-strict-ignore
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';

import { createBudget } from 'loot-core/src/client/actions/budgets';
import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';

import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { theme } from '../../../style';
import { Button, ButtonWithLoading } from '../../common/Button';
import { ButtonLink } from '../../common/ButtonLink';
import { BigInput } from '../../common/Input';

import { useBootstrapped, Title } from './common';

export function Login() {
  const dispatch = useDispatch();
  const { method = 'password' } = useParams();
  const [searchParams, _setSearchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get('error'));
  const { checked } = useBootstrapped(!searchParams.has('error'));

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

  const onSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>) => {
      if (typeof e !== 'undefined' && e !== null) {
        e.preventDefault();
      }
      if (method === 'password' && password === '') {
        return;
      }
      if (loading) {
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
    },
    [method, loading, error, dispatch, password],
  );

  useEffect(() => {
    if (checked && !searchParams.has('error')) {
      (async () => {
        if (method === 'header') {
          await onSubmit();
        }
      })();
    }
  }, [checked, searchParams, method, onSubmit]);

  async function onDemo() {
    await dispatch(createBudget({ demoMode: true }));
  }

  if (!checked) {
    return null;
  }

  return (
    <View style={{ maxWidth: 450, marginTop: -30, color: theme.pageText }}>
      <Title text="Sign in to this Actual instance" />
      <Text
        style={{
          fontSize: 16,
          color: theme.pageTextDark,
          lineHeight: 1.4,
        }}
      >
        If you lost your password, you likely still have access to your server
        to manually reset it.
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
        <form
          style={{ display: 'flex', flexDirection: 'row', marginTop: 30 }}
          onSubmit={onSubmit}
        >
          <BigInput
            autoFocus={true}
            placeholder="Password"
            type="password"
            onChange={e => setPassword(e.target.value)}
            style={{ flex: 1, marginRight: 10 }}
          />
          <ButtonWithLoading
            type="primary"
            loading={loading}
            style={{ fontSize: 15 }}
          >
            Sign in
          </ButtonWithLoading>
        </form>
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
            <ButtonLink
              type="primary"
              style={{ fontSize: 15 }}
              to={'/login/password?error=' + error}
            >
              Login with Password
            </ButtonLink>
          )}
          {!error && (
            <span>
              Checking Header Token Login ...{' '}
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
          type="bare"
          style={{ fontSize: 15, color: theme.pageTextLink, marginLeft: 10 }}
          onClick={onDemo}
        >
          Try Demo &rarr;
        </Button>
      </View>
    </View>
  );
}
