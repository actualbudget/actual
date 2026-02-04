// @ts-strict-ignore
import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { BigInput, ResponsiveInput } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { isElectron } from 'loot-core/shared/environment';
import { type OpenIdConfig } from 'loot-core/types/models';

import { Title, useBootstrapped } from './common';
import { OpenIdForm } from './OpenIdForm';

import { Link } from '@desktop-client/components/common/Link';
import {
  useAvailableLoginMethods,
  useLoginMethod,
} from '@desktop-client/components/ServerContext';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useDispatch } from '@desktop-client/redux';
import { warningBackground } from '@desktop-client/style/themes/dark';
import { loggedIn } from '@desktop-client/users/usersSlice';

function PasswordLogin({ setError, dispatch }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

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
    <View
      style={{
        flexDirection: isNarrowWidth ? 'column' : 'row',
        marginTop: 5,
        gap: '1rem',
      }}
    >
      <BigInput
        autoFocus
        placeholder={t('Password')}
        type="password"
        onChangeValue={setPassword}
        style={{ flex: 1 }}
        onEnter={onSubmitPassword}
      />
      <ButtonWithLoading
        variant="primary"
        isLoading={loading}
        style={{
          fontSize: 15,
          width: isNarrowWidth ? '100%' : 170,
          ...(isNarrowWidth ? { padding: 10 } : null),
        }}
        onPress={onSubmitPassword}
      >
        <Trans>Sign in</Trans>
      </ButtonWithLoading>
    </View>
  );
}

function OpenIdLogin({ setError }) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [warnMasterCreation, setWarnMasterCreation] = useState(false);
  const loginMethods = useAvailableLoginMethods();
  const [askForPassword, setAskForPassword] = useState(false);
  const [reviewOpenIdConfiguration, setReviewOpenIdConfiguration] =
    useState(false);
  const navigate = useNavigate();
  const [openIdConfig, setOpenIdConfig] = useState<OpenIdConfig | null>(null);
  const [firstLoginPassword, setFirstLoginPassword] = useState<string>('');

  async function onSetOpenId(config: OpenIdConfig) {
    setError(null);
    const { error } = await send('subscribe-bootstrap', { openId: config });

    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  }

  useEffect(() => {
    send('owner-created').then(created => setWarnMasterCreation(!created));
  }, []);

  useEffect(() => {
    if (loginMethods.some(method => method.method === 'password')) {
      setAskForPassword(true);
    } else {
      setAskForPassword(false);
    }
  }, [loginMethods]);

  async function onSubmitOpenId() {
    const { error, redirectUrl } = await send('subscribe-sign-in', {
      returnUrl: isElectron()
        ? await window.Actual.startOAuthServer()
        : window.location.origin,
      loginMethod: 'openid',
      password: firstLoginPassword,
    });

    if (error) {
      setError(error);
    } else {
      if (isElectron()) {
        window.Actual?.openURLInBrowser(redirectUrl);
      } else {
        window.location.href = redirectUrl;
      }
    }
  }

  return (
    <View>
      {!reviewOpenIdConfiguration && (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 5,
              gap: '1rem',
            }}
          >
            {warnMasterCreation && askForPassword && (
              <ResponsiveInput
                autoFocus
                placeholder={t('Enter server password')}
                type="password"
                onChangeValue={newValue => {
                  setFirstLoginPassword(newValue);
                }}
                style={{ flex: 1 }}
              />
            )}
            <Button
              variant="primary"
              onPress={onSubmitOpenId}
              style={
                warningBackground && {
                  padding: 6,
                  fontSize: 14,
                  width: 170,
                }
              }
              isDisabled={
                firstLoginPassword === '' &&
                askForPassword &&
                warnMasterCreation
              }
            >
              {warnMasterCreation ? (
                <Trans>Start using OpenID</Trans>
              ) : (
                <Trans>Sign in with OpenID</Trans>
              )}
            </Button>
          </View>
          {warnMasterCreation && (
            <>
              <label style={{ color: theme.warningText, marginTop: 10 }}>
                <Trans>
                  The first user to login with OpenID will be the{' '}
                  <Text style={{ fontWeight: 'bold' }}>server owner</Text>. This
                  can&apos;t be changed using UI.
                </Trans>
              </label>
              {askForPassword && (
                <Button
                  variant="bare"
                  isDisabled={firstLoginPassword === '' && warnMasterCreation}
                  onPress={() => {
                    send('get-openid-config', {
                      password: firstLoginPassword,
                    }).then(config => {
                      if ('error' in config) {
                        setError(config.error);
                      } else if ('openId' in config) {
                        setError(null);
                        setOpenIdConfig(config.openId);
                        setReviewOpenIdConfiguration(true);
                      }
                    });
                  }}
                  style={{
                    marginTop: 5,
                    ...(isNarrowWidth ? { padding: 10 } : null),
                  }}
                >
                  <Trans>Review OpenID configuration</Trans>
                </Button>
              )}
            </>
          )}
        </>
      )}
      {reviewOpenIdConfiguration && (
        <View style={{ marginTop: 20 }}>
          <Text
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
              fontWeight: 'bold ',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <Trans>Review OpenID configuration</Trans>
          </Text>
          <OpenIdForm
            openIdData={openIdConfig}
            otherButtons={[
              <Button
                key="cancel"
                variant="bare"
                style={{
                  marginRight: 10,
                  ...(isNarrowWidth && { padding: 10 }),
                }}
                onPress={() => {
                  setReviewOpenIdConfiguration(false);
                  setOpenIdConfig(null);
                  setFirstLoginPassword('');
                }}
              >
                <Trans>Cancel</Trans>
              </Button>,
            ]}
            onSetOpenId={async config => {
              onSetOpenId(config);
            }}
          />
        </View>
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
          type="button"
          style={{ fontSize: 15 }}
          to={'/login/password?error=' + error}
        >
          <Trans>Log in with password</Trans>
        </Link>
      ) : (
        <span>
          <Trans>Checking Header Token Login ...</Trans>{' '}
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </span>
      )}
    </View>
  );
}

export function Login() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const dispatch = useDispatch();
  const defaultLoginMethod = useLoginMethod();
  const [method, setMethod] = useState(defaultLoginMethod);
  const [searchParams, _setSearchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const { checked } = useBootstrapped();
  const loginMethods = useAvailableLoginMethods();
  const loginMethodRef = useRef<HTMLButtonElement>(null);
  const [loginMethodMenuOpen, setLoginMethodMenuOpen] = useState(false);

  useEffect(() => {
    setMethod(defaultLoginMethod);
  }, [defaultLoginMethod]);

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
        return t('Auto login failed - No header sent');
      case 'proxy-not-trusted':
        return t('Auto login failed - Proxy not trusted');
      case 'invalid-password':
        return t('Invalid password');
      case 'network-failure':
        return t('Unable to contact the server');
      case 'internal-error':
        return t('Internal error');
      default:
        return t(`An unknown error occurred: {{error}}`, { error });
    }
  }

  if (!checked) {
    return null;
  }

  return (
    <View style={{ maxWidth: 450, marginTop: -30, color: theme.pageText }}>
      <Title text={t('Sign in to this Actual instance')} />

      {loginMethods?.length > 1 && (
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextDark,
            lineHeight: 1.4,
            marginBottom: 10,
          }}
        >
          <Trans>
            If you lost your password, you likely still have access to your
            server to manually reset it.
          </Trans>
        </Text>
      )}

      {method === 'password' && (
        <PasswordLogin setError={setError} dispatch={dispatch} />
      )}

      {method === 'openid' && <OpenIdLogin setError={setError} />}

      {method === 'header' && <HeaderLogin error={error} />}

      {loginMethods?.length > 1 && (
        <View style={{ marginTop: 10 }}>
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'end',
            }}
          >
            <Button
              variant="bare"
              ref={loginMethodRef}
              onPress={() => setLoginMethodMenuOpen(true)}
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
                paddingTop: 5,
                width: 'fit-content',
                ...(isNarrowWidth ? { padding: 10 } : null),
              }}
            >
              <Trans>Select the login method</Trans>{' '}
              <SvgCheveronDown width={12} height={12} />
            </Button>
          </View>
          <Popover
            triggerRef={loginMethodRef}
            onOpenChange={value => {
              setLoginMethodMenuOpen(value);
            }}
            isOpen={loginMethodMenuOpen}
          >
            <Menu
              items={loginMethods
                ?.filter(f => f.method !== method)
                .map(m => ({
                  name: m.method,
                  text: m.displayName,
                }))}
              onMenuSelect={selected => {
                setError(null);
                setMethod(selected);
                setLoginMethodMenuOpen(false);
              }}
            />
          </Popover>
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
    </View>
  );
}
