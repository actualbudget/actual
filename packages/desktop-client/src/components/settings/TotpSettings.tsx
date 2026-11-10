import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';

import { useLoginMethod, useTotpSupported } from '#components/ServerContext';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SettingsRow } from './SettingsRow';

export function TotpSettings() {
  const { t } = useTranslation();

  const loginMethod = useLoginMethod();
  const totpSupported = useTotpSupported();
  const serverStatus = useSyncServerStatus();
  const dispatch = useDispatch();

  const [enabled, setEnabled] = useState<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    const res = await send('totp-status');
    if (!('error' in res)) {
      setEnabled(res.enabled);
    }
  }, []);

  // Two-factor authentication protects the server password. With OpenID active
  // there is no password to protect, and MFA belongs to the identity provider.
  // totpSupported keeps the section hidden against servers too old to have the
  // endpoints at all.
  const isApplicable =
    serverStatus !== 'no-server' && loginMethod === 'password' && totpSupported;

  useEffect(() => {
    if (isApplicable) {
      void refreshStatus();
    }
  }, [isApplicable, refreshStatus]);

  if (!isApplicable) {
    return null;
  }

  const isOffline = serverStatus === 'offline';

  return (
    <SettingsRow
      title={t('Two-factor authentication')}
      description={
        <>
          <Trans>
            Ask for a code from your authenticator app in addition to the server
            password.
          </Trans>{' '}
          {enabled ? (
            <Trans>Two-factor authentication is enabled.</Trans>
          ) : (
            <Trans>
              Two-factor authentication is disabled. You will need an
              authenticator app on your phone.
            </Trans>
          )}
          {isOffline && (
            <Text style={{ color: theme.warningText }}>
              <Trans>
                Server is offline. Two-factor settings are unavailable.
              </Trans>
            </Text>
          )}
        </>
      }
      control={
        <Button
          isDisabled={isOffline || enabled === null}
          onPress={() =>
            dispatch(
              pushModal({
                modal: {
                  name: enabled ? 'disable-totp' : 'enable-totp',
                  options: { onSave: refreshStatus },
                },
              }),
            )
          }
        >
          {enabled ? (
            <Trans>Disable two-factor authentication</Trans>
          ) : (
            <Trans>Enable two-factor authentication</Trans>
          )}
        </Button>
      }
    />
  );
}
