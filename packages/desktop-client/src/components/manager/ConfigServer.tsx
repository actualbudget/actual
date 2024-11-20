// @ts-strict-ignore
import React, { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { redirect } from 'react-router-dom';

import {
  isNonProductionEnvironment,
  isElectron,
} from 'loot-core/src/shared/environment';

import { useActions } from '../../hooks/useActions';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useNavigate } from '../../hooks/useNavigate';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useServerURL, useSetServerURL } from '../ServerContext';

import { Title } from './subscribe/common';

export function ConfigServer() {
  const { t } = useTranslation();
  const { createBudget, loggedIn } = useActions();
  const navigate = useNavigate();
  const currentUrl = useServerURL();
  const [ngrokConfig] = useGlobalPref('ngrokConfig');
  const setServerUrl = useSetServerURL();
  const onShowExternalConfiguration = () => {
    navigate('/config-server/external');
  };

  const onShowInternalConfiguration = () => {
    navigate('/config-server/internal');
  };

  async function onSkip() {
    await setServerUrl(null);
    await loggedIn();
    navigate('/');
  }

  async function onCreateTestFile() {
    await setServerUrl(null);
    await createBudget({ testMode: true });
    window.__navigate('/');
  }

  // let serverConfiguration = undefined;
  // if (currentUrl) {
  //   serverConfiguration = 'external';
  // } else if (ngrokConfig) {
  //   serverConfiguration = 'internal';
  // }
  useEffect(() => {
    // If user has already setup server navigate them to the configure screen
    // TODO: make an easy setting to determin if internal or external server is setup
    if (currentUrl) {
      // external
      navigate('/config-server/external');
    } else if (ngrokConfig) {
      // internal
      navigate('/config-server/internal');
    }
  }, [currentUrl, navigate, ngrokConfig]);

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text={t('Setup your server')} />

      {isElectron() && (
        <View
          style={{
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '20px',
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
              If you like, Actual can connect to a server for you to sync your
              data across devices.
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
              Would you like to host the server on your computer or connect to
              an external server?
            </Trans>
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexFlow: 'row wrap',
              justifyContent: 'center',
              marginTop: 15,
              gap: '15px',
            }}
          >
            <Button onPress={onShowInternalConfiguration}>
              Host on this computer
            </Button>

            <Button onPress={onShowExternalConfiguration}>
              Connect to an external server
            </Button>
          </View>
        </View>
      )}

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
                onPress={onCreateTestFile}
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
