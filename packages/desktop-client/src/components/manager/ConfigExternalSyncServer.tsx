// @ts-strict-ignore
import React, { useState, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { type To } from 'react-router-dom';

import {
  isNonProductionEnvironment,
  isElectron,
} from 'loot-core/src/shared/environment';

import { useActions } from '../../hooks/useActions';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useNavigate } from '../../hooks/useNavigate';
import { theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button2';
import { BigInput } from '../common/Input';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useServerURL, useSetServerURL } from '../ServerContext';

import { Title } from './subscribe/common';

export function ConfigExternalSyncServer() {
  const { t } = useTranslation();
  const { createBudget, signOut, loggedIn } = useActions();
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
    const { error } = await setServerUrl(url);

    if (
      ['network-failure', 'get-server-failure'].includes(error) &&
      !url.startsWith('http://') &&
      !url.startsWith('https://')
    ) {
      const { error } = await setServerUrl('https://' + url);
      if (error) {
        setUrl('https://' + url);
        setError(error);
      } else {
        await signOut();
        navigate('/');
      }
      setLoading(false);
    } else if (error) {
      setLoading(false);
      setError(error);
    } else {
      setLoading(false);
      await signOut();
      navigate('/');
    }
  }

  function onSameDomain() {
    setUrl(window.location.origin);
  }

  async function onSelectSelfSignedCertificate() {
    const selfSignedCertificateLocation = await window.Actual?.openFileDialog({
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

  function onStopUsingExternalServer() {
    setServerUrl(null);
    loggedIn();
    navigate('/');
  }

  function onBack() {
    // If server url is setup, go back to files manager, otherwise go to server setup
    if (currentUrl) {
      navigate('/');
    } else {
      navigate(-1);
    }
  }

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text={t('Server configuration')} />

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
            After running the server, specify the URL here to use it. We will
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
          gap: '10px',
        }}
      >
        <Button onPress={onBack}>Back</Button>
        {currentUrl && (
          <Button onPress={onStopUsingExternalServer}>
            Stop using external server
          </Button>
        )}
      </View>
    </View>
  );
}
