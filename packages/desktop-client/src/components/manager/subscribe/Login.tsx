// @ts-strict-ignore
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { loggedIn } from 'loot-core/src/client/actions/user';
import { send } from 'loot-core/src/platform/client/fetch';
import { type OpenIdConfig } from 'loot-core/types/models/openid';

import { useNavigate } from '../../../hooks/useNavigate';
import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { styles, theme } from '../../../style';
import { Button, ButtonWithLoading } from '../../common/Button2';
import { BigInput } from '../../common/Input';
import { Label } from '../../common/Label';
import { Link } from '../../common/Link';
import { Select } from '../../common/Select';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { useAvailableLoginMethods, useLoginMethod } from '../../ServerContext';

import { useBootstrapped, Title } from './common';
import { OpenIdForm } from './OpenIdForm';

function PasswordLogin({ setError, dispatch }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmitPassword() {
    if (password === '' || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = await send('subscribe-sign-in', {
      password,
      loginMethod: 'password',
    });
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      dispatch(loggedIn());
    }
  }

  return (
    <View style={{ flexDirection: 'row', marginTop: 5 }}>
      <BigInput
        autoFocus={true}
        placeholder="Password"
        type="password"
        onChangeValue={newValue => setPassword(newValue)}
        style={{ flex: 1, marginRight: 10 }}
      />
      <ButtonWithLoading
        variant="primary"
        isLoading={loading}
        style={{ fontSize: 15 }}
        onPress={onSubmitPassword}
      >
        Sign in
      </ButtonWithLoading>
    </View>
  );
}

function OpenIdLogin({ setError }) {
  const [warnMasterCreation, setWarnMasterCreation] = useState(false);
  const [reviewOpenIdConfiguration, setReviewOpenIdConfiguration] =
    useState(false);
  const navigate = useNavigate();

  async function onSetOpenId(config: OpenIdConfig) {
    setError(null);
    const { error } = await send('subscribe-bootstrap', { openid: config });

    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  }

  useEffect(() => {
    send('master-created').then(created => setWarnMasterCreation(!created));
  }, []);

  async function onSubmitOpenId() {
    const { error, redirect_url } = await send('subscribe-sign-in', {
      return_url: window.location.origin,
      loginMethod: 'openid',
    });

    if (error) {
      setError(error);
    } else {
      window.location.href = redirect_url;
    }
  }

  return (
    <View>
      {!reviewOpenIdConfiguration && (
        <>
          <View style={{ flexDirection: 'row' }}>
            <Button
              variant="primary"
              style={{
                fontSize: 15,
                alignSelf: 'center',
                flexGrow: 1,
                marginTop: 5,
              }}
              onPress={onSubmitOpenId}
            >
              Sign in with OpenId
            </Button>
          </View>
          {warnMasterCreation && (
            <>
              <label style={{ color: theme.warningText, marginTop: 10 }}>
                The first user to login with OpenId will be the{' '}
                <Text style={{ fontWeight: 'bold' }}>server owner</Text>. This
                can&apos;t be changed using UI.
              </label>
              <Button
                variant="bare"
                onPress={() => setReviewOpenIdConfiguration(true)}
                style={{ marginTop: 5 }}
              >
                Review OpenID configuration
              </Button>
            </>
          )}
        </>
      )}
      {reviewOpenIdConfiguration && (
        <OpenIdForm
          loadData={true}
          otherButtons={[
            <Button
              key="cancel"
              variant="bare"
              style={{ marginRight: 10 }}
              onPress={() => setReviewOpenIdConfiguration(false)}
            >
              Cancel
            </Button>,
          ]}
          onSetOpenId={async config => {
            onSetOpenId(config);
          }}
        />
      )}
    </View>
  );
}

function HeaderLogin({ error }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
      }}
    >
      {error ? (
        <Link
          variant="button"
          type="primary"
          style={{ fontSize: 15 }}
          to={'/login/password?error=' + error}
        >
          Login with Password
        </Link>
      ) : (
        <span>
          Checking Header Token Login ...{' '}
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </span>
      )}
    </View>
  );
}

export function Login() {
  const dispatch = useDispatch();
  const defaultLoginMethod = useLoginMethod();
  const [method, setMethod] = useState(defaultLoginMethod);
  const [searchParams, _setSearchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const { checked } = useBootstrapped();
  const loginMethods = useAvailableLoginMethods();

  useEffect(() => {
    if (checked && !searchParams.has('error')) {
      (async () => {
        if (method === 'header') {
          setError(null);
          const { error } = await send('subscribe-sign-in', {
            password: '',
            loginMethod: method,
          });

          if (error) {
            setError(error);
          } else {
            dispatch(loggedIn());
          }
        }
      })();
    }
  }, [loginMethods, checked, searchParams, method, dispatch]);

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
      case 'internal-error':
        return 'Internal error';
      default:
        return `An unknown error occurred: ${error}`;
    }
  }

  if (!checked) {
    return null;
  }

  return (
    <View style={{ maxWidth: 450, marginTop: -30, color: theme.pageText }}>
      <Title text="Sign in to this Actual instance" />

      {loginMethods.length > 1 && (
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextDark,
            lineHeight: 1.4,
            marginBottom: 10,
          }}
        >
          If you lost your password, you likely still have access to your server
          to manually reset it.
        </Text>
      )}

      {loginMethods.length > 1 && (
        <View style={{ marginTop: 10 }}>
          <Label
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
              paddingTop: 5,
            }}
            title="Select the login method"
          />
          <Select
            value={method}
            onChange={newValue => {
              setError(null);
              setMethod(newValue);
            }}
            options={loginMethods.map(m => [m.method, m.displayName])}
          />
        </View>
      )}

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
        <PasswordLogin setError={setError} dispatch={dispatch} />
      )}

      {method === 'openid' && <OpenIdLogin setError={setError} />}

      {method === 'header' && <HeaderLogin error={error} />}
    </View>
  );
}
