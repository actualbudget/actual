import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Label } from '@actual-app/components/label';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { useLoginMethod } from '#components/ServerContext';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { Setting } from './UI';

export function TotpSettings() {
  const { t } = useTranslation();

  const loginMethod = useLoginMethod();
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
  const isApplicable =
    serverStatus !== 'no-server' && loginMethod === 'password';

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
    <Setting
      primaryAction={
        <>
          <label>
            <Trans>Two-factor authentication is</Trans>{' '}
            <label style={{ fontWeight: 'bold' }}>
              {enabled ? t('enabled') : t('disabled')}
            </label>
          </label>
          {isOffline && (
            <View>
              <Text style={{ paddingTop: 5, color: theme.warningText }}>
                <Trans>
                  Server is offline. Two-factor settings are unavailable.
                </Trans>
              </Text>
            </View>
          )}
          <Button
            style={{ marginTop: '10px' }}
            variant="normal"
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
              <Trans>Turn off two-factor authentication</Trans>
            ) : (
              <Trans>Turn on two-factor authentication</Trans>
            )}
          </Button>
          {!enabled && (
            <Label
              style={{ paddingTop: 5 }}
              title={t('You will need an authenticator app on your phone.')}
            />
          )}
        </>
      }
    >
      <Text>
        <Trans>
          <strong>Two-factor authentication</strong> asks for a code from your
          authenticator app in addition to the server password.
        </Trans>
      </Text>
    </Setting>
  );
}
