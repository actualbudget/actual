// @ts-strict-ignore
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { isElectron } from 'loot-core/src/shared/environment';

import { useActions } from '../../hooks/useActions';
import { useNavigate } from '../../hooks/useNavigate';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useSetServerURL } from '../ServerContext';

import { Title } from './subscribe/common';

export function ConfigServerDelMe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setServerUrl = useSetServerURL();
  const { loggedIn } = useActions();

  async function onSkip() {
    await setServerUrl(null);
    await loggedIn();
    navigate('/');
  }

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text={t('Let’s set up your server!')} />

      <Text
        style={{
          fontSize: 16,
          color: theme.pageText,
          lineHeight: 1.5,
        }}
      >
        <Trans>
          If you like, Actual can setup a server for you to sync your data
          across devices.
        </Trans>
      </Text>
      {isElectron() && (
        <>
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
          <Button onPress={() => navigate('/config-server/internal')}>
            Host on this computer
          </Button>
        </>
      )}
      <Button onPress={() => navigate('/config-server/external')}>
        Connect to an external server
      </Button>
      <Button onPress={onSkip}>I don’t want a server</Button>
    </View>
  );
}
