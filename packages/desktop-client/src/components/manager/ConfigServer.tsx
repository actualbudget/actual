// @ts-strict-ignore
import React, { useState, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { BigInput } from '@actual-app/components/input';
import { Label } from '@actual-app/components/label';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  isNonProductionEnvironment,
  isElectron,
} from 'loot-core/shared/environment';

import { Title } from './subscribe/common';

import { createBudget } from '@desktop-client/budgets/budgetsSlice';
import { Link } from '@desktop-client/components/common/Link';
import {
  useServerURL,
  useSetServerURL,
} from '@desktop-client/components/ServerContext';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { saveGlobalPrefs } from '@desktop-client/prefs/prefsSlice';
import { useDispatch } from '@desktop-client/redux';
import { loggedIn, signOut } from '@desktop-client/users/usersSlice';

export function ElectronServerConfig({
  onDoNotUseServer,
  onSetServerConfigView,
}: {
  onDoNotUseServer: () => void;
  onSetServerConfigView: (view: 'internal' | 'external') => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setServerUrl = useSetServerURL();
  const currentUrl = useServerURL();
  const dispatch = useDispatch();

  const [syncServerConfig, setSyncServerConfig] =
    useGlobalPref('syncServerConfig');

  const [electronServerPort, setElectronServerPort] = useState(
    syncServerConfig?.port || 5007,
  );
  const [configError, setConfigError] = useState<string | null>(null);

  const canShowExternalServerConfig = !syncServerConfig?.port && !currentUrl;
  const hasInternalServerConfig = syncServerConfig?.port;

  const [startingSyncServer, setStartingSyncServer] = useState(false);

  const onConfigureSyncServer = async () => {
    if (startingSyncServer) {
      return; // Prevent multiple clicks
    }

    if (
      isNaN(electronServerPort) ||
      electronServerPort <= 0 ||
      electronServerPort > 65535
    ) {
      setConfigError(t('Ports must be within range 1 - 65535'));
      return;
    }

    try {
      setConfigError(null);
      setStartingSyncServer(true);
      // Ensure config is saved before starting the server
      await dispatch(
        saveGlobalPrefs({
          prefs: {
            syncServerConfig: {
              ...syncServerConfig,
              port: electronServerPort,
              autoStart: true,
            },
          },
        }),
      ).unwrap();

      await window.globalThis.Actual.stopSyncServer();
      await window.globalThis.Actual.startSyncServer();
      setStartingSyncServer(false);
      initElectronSyncServerRunningStatus();
      await setServerUrl(`http://localhost:${electronServerPort}`);
      navigate('/');
    } catch (error) {
      setStartingSyncServer(false);
      setConfigError(t('Failed to configure sync server'));
      console.error('Failed to configure sync server:', error);
    }
  };

  const [electronSyncServerRunning, setElectronSyncServerRunning] =
    useState(false);

  const initElectronSyncServerRunningStatus = async () => {
    setElectronSyncServerRunning(
      await window.globalThis.Actual.isSyncServerRunning(),
    );
  };

  useEffect(() => {
    initElectronSyncServerRunningStatus();
  }, []);

  async function dontUseSyncServer() {
    setSyncServerConfig(null);

    if (electronSyncServerRunning) {
      await window.globalThis.Actual.stopSyncServer();
    }

    onDoNotUseServer();
  }

  return (
    <>
      <Title text={t('Configure your server')} />
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.pageText,
            lineHeight: 1.5,
          }}
        >
          <Trans>
            Set up your server below to enable seamless data synchronization
            across your devices, bank sync and more...
          </Trans>
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.pageText,
            lineHeight: 1.5,
          }}
        >
          <Trans>
            Need to expose your server to the internet? Follow our step-by-step{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/install/desktop-app"
            >
              guide
            </Link>{' '}
            for more information.
          </Trans>
        </Text>

        {configError && (
          <Text style={{ color: theme.errorText, marginTop: 10 }}>
            {configError}
          </Text>
        )}

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'column', gap: 5, flex: 1 }}>
            <Label title={t('Domain')} style={{ textAlign: 'left' }} />
            <BigInput
              value="localhost"
              disabled
              type="text"
              className={css({
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              })}
            />
          </View>

          <View style={{ flexDirection: 'column', gap: 5 }}>
            <Label
              title={t('Port')}
              style={{ textAlign: 'left', width: '7ch' }}
            />
            <BigInput
              name="port"
              value={String(electronServerPort)}
              aria-label={t('Port')}
              type="number"
              className={css({
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
                width: '7ch',
                textAlign: 'center',
              })}
              autoFocus={true}
              maxLength={5}
              onChange={event =>
                setElectronServerPort(Number(event.target.value))
              }
            />
          </View>

          <View
            style={{
              flexDirection: 'column',
              gap: 5,
              justifyContent: 'end',
            }}
          >
            <Label title={t('')} style={{ textAlign: 'left', width: '7ch' }} />
            {!electronSyncServerRunning ? (
              <ButtonWithLoading
                variant="primary"
                style={{ padding: 10, width: '8ch' }}
                onPress={onConfigureSyncServer}
                isLoading={startingSyncServer}
              >
                <Trans>Start</Trans>
              </ButtonWithLoading>
            ) : (
              <ButtonWithLoading
                variant="primary"
                style={{ padding: 10, width: '8ch' }}
                onPress={onConfigureSyncServer}
                isLoading={startingSyncServer}
              >
                <Trans>Save</Trans>
              </ButtonWithLoading>
            )}
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: 20,
          gap: 15,
          flexFlow: 'row wrap',
          justifyContent: 'center',
        }}
      >
        {hasInternalServerConfig && (
          <Button
            variant="bare"
            style={{ color: theme.pageTextLight, margin: 5 }}
            onPress={() => navigate(-1)}
          >
            <Trans>Cancel</Trans>
          </Button>
        )}
        <Button
          variant="bare"
          style={{ color: theme.pageTextLight, margin: 5 }}
          onPress={dontUseSyncServer}
        >
          <Trans>Don’t use a server</Trans>
        </Button>
        {canShowExternalServerConfig && (
          <Button
            variant="bare"
            style={{ color: theme.pageTextLight, margin: 5 }}
            onPress={() => onSetServerConfigView('external')}
          >
            <Trans>Use an external server</Trans>
          </Button>
        )}
      </View>
    </>
  );
}

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
    if (url === null || url === '' || loading) {
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

  const [syncServerConfig] = useGlobalPref('syncServerConfig');

  const hasExternalServerConfig = !syncServerConfig?.port && !!currentUrl;

  const [serverConfigView, onSetServerConfigView] = useState<
    'internal' | 'external'
  >(() => {
    if (isElectron() && !hasExternalServerConfig) {
      return 'internal';
    }

    return 'external';
  });

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      {serverConfigView === 'internal' && (
        <ElectronServerConfig
          onDoNotUseServer={onSkip}
          onSetServerConfigView={onSetServerConfigView}
        />
      )}
      {serverConfigView === 'external' && (
        <>
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
                There is no server configured. After running the server, specify
                the URL here to use the app. You can always change this later.
                We will validate that Actual is running at this URL.
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
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    marginTop: 20,
                  }}
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
          <View
            style={{ display: 'flex', flexDirection: 'row', marginTop: 30 }}
          >
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
              <Trans>OK</Trans>
            </ButtonWithLoading>
            {currentUrl && (
              <Button
                variant="bare"
                style={{ fontSize: 15, marginLeft: 10 }}
                onPress={() => navigate(-1)}
              >
                <Trans>Cancel</Trans>
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
                <Trans>Stop using a server</Trans>
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
                    <Trans>Use current domain</Trans>
                  </Button>
                )}
                <Button
                  variant="bare"
                  style={{ color: theme.pageTextLight, margin: 5 }}
                  onPress={onSkip}
                >
                  <Trans>Don’t use a server</Trans>
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
                    <Trans>Create test file</Trans>
                  </Button>
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}
