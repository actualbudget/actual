import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { useLoginMethod, useMultiuserEnabled } from '#components/ServerContext';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SettingsRow } from './SettingsRow';

export function AuthSettings() {
  const { t } = useTranslation();

  const multiuserEnabled = useMultiuserEnabled();
  const loginMethod = useLoginMethod();
  const dispatch = useDispatch();
  const serverStatus = useSyncServerStatus();

  // Hide the OpenID block entirely when no server is configured
  if (serverStatus === 'no-server') {
    return null;
  }

  const isOffline = serverStatus === 'offline';
  const isUsingPassword = loginMethod === 'password';

  return (
    <SettingsRow
      title={t('Authentication method')}
      description={t(
        'Enable OpenID to let users log in through an OpenID provider instead of the server password. OpenID is required for multi-user mode.',
      )}
      control={
        isUsingPassword ? (
          <Button
            id="start-using"
            isDisabled={isOffline}
            onPress={() =>
              dispatch(
                pushModal({ modal: { name: 'enable-openid', options: {} } }),
              )
            }
          >
            <Trans>Start using OpenID</Trans>
          </Button>
        ) : (
          <Button
            isDisabled={isOffline}
            onPress={() =>
              dispatch(
                pushModal({
                  modal: { name: 'enable-password-auth', options: {} },
                }),
              )
            }
          >
            <Trans>Disable OpenID</Trans>
          </Button>
        )
      }
    >
      {isOffline && (
        <Text style={{ color: theme.warningText }}>
          <Trans>Server is offline. OpenID settings are unavailable.</Trans>
        </Text>
      )}
      {!isUsingPassword && multiuserEnabled && (
        <Text style={{ color: theme.errorText }}>
          <Trans>Disabling OpenID will deactivate multi-user mode.</Trans>
        </Text>
      )}
    </SettingsRow>
  );
}
