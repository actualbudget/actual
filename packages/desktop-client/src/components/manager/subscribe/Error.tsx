// @ts-strict-ignore
import React from 'react';
import { Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { View } from '@actual-app/components/view';

import { useNavigate } from '../../../hooks/useNavigate';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';

function getErrorMessage(reason) {
  switch (reason) {
    case 'network-failure':
      return 'Unable to access server. Make sure the configured URL for the server is accessible.';
    default:
      return 'Server returned an error while checking its status.';
  }
}

export function Error() {
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = (location.state || {}) as { error? };

  function onTryAgain() {
    navigate('/');
  }

  return (
    <View style={{ alignItems: 'center', color: theme.pageText }}>
      <Text
        style={{
          fontSize: 16,
          color: theme.pageTextDark,
          lineHeight: 1.4,
        }}
      >
        {getErrorMessage(error)}
      </Text>
      <Button onPress={onTryAgain} style={{ marginTop: 20 }}>
        <Trans>Try again</Trans>
      </Button>
    </View>
  );
}
