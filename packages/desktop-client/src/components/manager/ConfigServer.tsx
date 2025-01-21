// @ts-strict-ignore
import React, { useState, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { createBudget } from 'loot-core/client/budgets/budgetsSlice';
import { loggedIn, signOut } from 'loot-core/client/users/usersSlice';
import {
  isNonProductionEnvironment,
  isElectron,
} from 'loot-core/src/shared/environment';

import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useNavigate } from '../../hooks/useNavigate';
import { useDispatch } from '../../redux';
import { theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button2';
import { BigInput } from '../common/Input';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useServerURL, useSetServerURL } from '../ServerContext';

import { Title } from './subscribe/common';

export function ConfigServer() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const currentUrl = useServerURL();
  const setServerUrl = useSetServerURL();
  useEffect(() => {
    setUrl(currentUrl);
  }, [currentUrl]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restartElectronServer = useCallback(() => {
    globalThis.window.Actual.restartElectronServer();
    setError(null);
  }, []);

  const [_serverSelfSignedCert, setServerSelfSignedCert] = useGlobalPref(
    'serverSelfSignedCert',
    restartElectronServer,
  );

  function getErrorMessage(error: string) {
    switch (error) {
      case 'network-failure':
        return t(
          'Server is not running at this URL. Make sure you have HTTPS set up properly.',
        );
      default:
        return t(
          'Server does not look like an Actual server. Is it set up correctly?',
        );
    }
  }

  async function onSubmit() {
    if (url === '' || loading) {
      return;
    }

    setError(null);
    setLoading(true);

    let httpUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      httpUrl = 'https://' + url;
    }

    const { error } = await setServerUrl(httpUrl);
    setUrl(httpUrl);

    if (error) {
      setLoading(false);
      setError(error);
    } else {
      setLoading(false);
      await dispatch(signOut());
      navigate('/');
    }
  }

  function onSameDomain() {
    setUrl(window.location.origin);
  }

  async function onSelectSelfSignedCertificate() {
    const selfSignedCertificateLocation = await window.Actual.openFileDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Self Signed Certificate',
          extensions: ['crt', 'pem'],
        },
      ],
    });

    if (selfSignedCertificateLocation) {
      setServerSelfSignedCert(selfSignedCertificateLocation[0]);
    }
  }

  async function onSkip() {
    await setServerUrl(null);
    await dispatch(loggedIn());
    navigate('/');
  }

  async function onCreateTestFile() {
    await setServerUrl(null);
    await dispatch(createBudget({ testMode: true }));
    navigate('/');
  }

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text={t('Where’s the server?')} />

      <Text
        style={{
          fontSize: 16,
          color: theme.tableRowHeaderText,
          lineHeight: 1.5,
        }}
      >
        {currentUrl ? (
          <Trans>
            Existing sessions will be logged out and you will log in to this
            server. We will validate that Actual is running at this URL.
          </Trans>
        ) : (
          <Trans>
            There is no server configured. After running the server, specify the
            URL here to use the app. You can always change this later. We will
            validate that Actual is running at this URL.
          </Trans>
        )}
      </Text>

      {error && (
        <>
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
          {isElectron() && (
            <View
              style={{ display: 'flex', flexDirection: 'row', marginTop: 20 }}
            >
              <Text
                style={{
                  color: theme.errorText,
                  borderRadius: 4,
                  fontSize: 15,
                }}
              >
                <Trans>
                  If the server is using a self-signed certificate{' '}
                  <Link
                    variant="text"
                    style={{ fontSize: 15 }}
                    onClick={onSelectSelfSignedCertificate}
                  >
                    select it here
                  </Link>
                  .
                </Trans>
              </Text>
            </View>
          )}
        </>
      )}

      <View style={{ display: 'flex', flexDirection: 'row', marginTop: 30 }}>
        <BigInput
          autoFocus={true}
          placeholder={t('https://example.com')}
          value={url || ''}
          onChangeValue={setUrl}
          style={{ flex: 1, marginRight: 10 }}
          onEnter={onSubmit}
        />
        <ButtonWithLoading
          variant="primary"
          isLoading={loading}
          style={{ fontSize: 15 }}
          onPress={onSubmit}
        >
          {t('OK')}
        </ButtonWithLoading>
        {currentUrl && (
          <Button
            variant="bare"
            style={{ fontSize: 15, marginLeft: 10 }}
            onPress={() => navigate(-1)}
          >
            {t('Cancel')}
          </Button>
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexFlow: 'row wrap',
          justifyContent: 'center',
          marginTop: 15,
        }}
      >
        {currentUrl ? (
          <Button
            variant="bare"
            style={{ color: theme.pageTextLight }}
            onPress={onSkip}
          >
            {t('Stop using a server')}
          </Button>
        ) : (
          <>
            {!isElectron() && (
              <Button
                variant="bare"
                style={{
                  color: theme.pageTextLight,
                  margin: 5,
                  marginRight: 15,
                }}
                onPress={onSameDomain}
              >
                {t('Use current domain')}
              </Button>
            )}
            <Button
              variant="bare"
              style={{ color: theme.pageTextLight, margin: 5 }}
              onPress={onSkip}
            >
              {t('Don’t use a server')}
            </Button>

            {isNonProductionEnvironment() && (
              <Button
                variant="primary"
                style={{ marginLeft: 15 }}
                onPress={async () => {
                  await onCreateTestFile();
                  navigate('/');
                }}
              >
                {t('Create test file')}
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );
}
