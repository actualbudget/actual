// @ts-strict-ignore
import React, { useState, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useNavigate } from '../../hooks/useNavigate';
import { theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useServerURL, useSetServerURL } from '../ServerContext';

import { Title } from './subscribe/common';

export function ConfigInternalSyncServer() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <View style={{ maxWidth: 500, marginTop: -30 }}>
      <Title text={t('Server configuration')} />

      <Text
        style={{
          fontSize: 16,
          color: theme.pageText,
          lineHeight: 1.5,
        }}
      >
        <Trans>
          Actual can setup a server for you to sync your data across devices. It
          can either run on your computer or on a server. If you want to run it
          on your computer, you can use the button below to start the server. If
          you want to run it on a server, you can enter the URL of the server
          below.
        </Trans>
      </Text>
      <Button onPress={() => navigate(-1)}>Back</Button>
    </View>
  );
}
