// @ts-strict-ignore
import React, { useState, useEffect, useCallback } from 'react';
import { Group, NumberField } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useNavigate } from '../../hooks/useNavigate';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button2';
import { Input } from '../common/Input';
import { Label } from '../common/Label';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Title } from './subscribe/common';

export function ConfigInternalSyncServer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [serverConfig, setServerConfig] = useState({
    port: 5007,
    certificatePath: undefined, // merge with current global.json pref
    ngrokDomain: undefined,
    ngrokAuthToken: undefined,
  });

  const startActualServer = async () => {
    await globalThis.Actual.startActualServer('v24.10.1');
  };

  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  const [ngrokConfig] = useGlobalPref('ngrokConfig');
  const exposeActualServer = async () => {
    const hasRequiredNgrokSettings =
      ngrokConfig?.authToken && ngrokConfig?.port && ngrokConfig?.domain;
    if (hasRequiredNgrokSettings) {
      const url = await globalThis.Actual.exposeActualServer({
        authToken: ngrokConfig.authToken,
        port: ngrokConfig.port,
        domain: ngrokConfig.domain,
      });

      console.info('exposing actual at: ' + url);
    } else {
      console.info('ngrok settings not set');
    }
  };

  const handleChange = (name: keyof typeof serverConfig, event) => {
    console.info(event);
    const { value } = event.target;
    setServerConfig({
      ...serverConfig,
      [name]: value,
    });
  };

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text={t('Server configuration')} />

      <View>
        <Text
          style={{
            fontSize: 16,
            color: theme.pageText,
            lineHeight: 1.5,
          }}
        >
          <Trans>
            Actual can setup a server for you to sync your data across devices.
            It can either run on your computer or on a server. If you want to
            run it on your computer, you can use the button below to start the
            server. If you want to run it on a server, you can enter the URL of
            the server below.
          </Trans>
        </Text>

        <View>
          <Label title={t('Port')} />
          <Input
            type="number"
            value={serverConfig.port}
            name={t('Port')}
            onChange={event => handleChange('port', event)}
          />
        </View>

        <View>
          <Label title={t('SSL Certificate (optional)')} />
          <Input
            type="file"
            value={serverConfig.certificatePath}
            name={t('Certificate')}
            onChange={event => handleChange('certificatePath', event)}
          />
        </View>

        <View>
          <Label title={t('Ngrok custom domain (optional)')} />
          <Input
            type="text"
            value={serverConfig.ngrokDomain}
            name={t('Ngrok Custom Domain')}
            onChange={event => handleChange('ngrokDomain', event)}
          />
        </View>
        <View>
          <Label title={t('Ngrok auth token (optional)')} />
          <Input
            type="text"
            value={serverConfig.ngrokAuthToken}
            name={t('Ngrok Auth Token')}
            onChange={event => handleChange('ngrokAuthToken', event)}
          />
        </View>
      </View>
      <View>
        <Button onPress={() => navigate(-1)}>Back</Button>
        <Button
          variant="primary"
          onPress={startActualServer}
          style={{
            ...narrowButtonStyle,
            marginLeft: 10,
          }}
        >
          Start Server
        </Button>
        <Button
          variant="primary"
          onPress={exposeActualServer}
          style={{
            ...narrowButtonStyle,
            marginLeft: 10,
          }}
        >
          Expose Server
        </Button>
      </View>
    </View>
  );
}
