import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { pushModal } from 'loot-core/client/modals/modalsSlice';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useDispatch } from '../../redux';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Label } from '../common/Label';
import { Text } from '../common/Text';
import { useMultiuserEnabled, useLoginMethod } from '../ServerContext';

import { Setting } from './UI';

export function AuthSettings() {
  const { t } = useTranslation();

  const multiuserEnabled = useMultiuserEnabled();
  const loginMethod = useLoginMethod();
  const dispatch = useDispatch();
  const openidAuthFeatureFlag = useFeatureFlag('openidAuth');

  return openidAuthFeatureFlag === true ? (
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
                      name: 'enable-openid',
                      options: {
                        onSave: async () => {},
                      },
                    }),
                  )
                }
              >
                Start using OpenID
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
                      name: 'enable-password-auth',
                      options: {
                        onSave: async () => {},
                      },
                    }),
                  )
                }
              >
                <Trans>Disable OpenID</Trans>
              </Button>
              {multiuserEnabled && (
                <label style={{ paddingTop: 5, color: theme.errorText }}>
                  <Trans>
                    Disabling OpenID will deactivate multi-user mode.
                  </Trans>
                </label>
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
  ) : null;
}
