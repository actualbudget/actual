import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Label } from '@actual-app/components/label';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { Setting } from './UI';

import {
  useMultiuserEnabled,
  useLoginMethod,
} from '@desktop-client/components/ServerContext';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export function AuthSettings() {
  const { t } = useTranslation();

  const multiuserEnabled = useMultiuserEnabled();
  const loginMethod = useLoginMethod();
  const dispatch = useDispatch();

  return (
    <Setting
      primaryAction={
        <>
          <label>
            <Trans>OpenID is</Trans>{' '}
            <label style={{ fontWeight: 'bold' }}>
              {loginMethod === 'openid' ? t('enabled') : t('disabled')}
            </label>
          </label>
          {loginMethod === 'password' && (
            <>
              <Button
                id="start-using"
                style={{
                  marginTop: '10px',
                }}
                variant="normal"
                onPress={() =>
                  dispatch(
                    pushModal({
                      modal: {
                        name: 'enable-openid',
                        options: {
                          onSave: async () => {},
                        },
                      },
                    }),
                  )
                }
              >
                <Trans>Start using OpenID</Trans>
              </Button>
              <Label
                style={{ paddingTop: 5 }}
                title={t('OpenID is required to enable multi-user mode.')}
              />
            </>
          )}
          {loginMethod !== 'password' && (
            <>
              <Button
                style={{
                  marginTop: '10px',
                }}
                variant="normal"
                onPress={() =>
                  dispatch(
                    pushModal({
                      modal: {
                        name: 'enable-password-auth',
                        options: {
                          onSave: async () => {},
                        },
                      },
                    }),
                  )
                }
              >
                <Trans>Disable OpenID</Trans>
              </Button>
              {multiuserEnabled && (
                <Text style={{ paddingTop: 5, color: theme.errorText }}>
                  <Trans>
                    Disabling OpenID will deactivate multi-user mode.
                  </Trans>
                </Text>
              )}
            </>
          )}
        </>
      }
    >
      <Text>
        <Trans>
          <strong>Authentication method</strong> modifies how users log in to
          the system.
        </Trans>
      </Text>
    </Setting>
  );
}
