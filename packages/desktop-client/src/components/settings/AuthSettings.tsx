import React from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Label } from '../common/Label';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useMultiuserEnabled, useLoginMethod } from '../ServerContext';

import { Setting } from './UI';

export function AuthSettings() {
  const multiuserEnabled = useMultiuserEnabled();
  const loginMethod = useLoginMethod();
  const dispatch = useDispatch();
  const openidAuthFeatureFlag = useFeatureFlag('openidAuth');

  return (
    <View>
      {openidAuthFeatureFlag && (
        <Setting
          primaryAction={
            <>
              <label>
                OpenID is{' '}
                <label style={{ fontWeight: 'bold' }}>
                  {loginMethod === 'openid' ? 'enabled' : 'disabled'}
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
                        pushModal('enable-openid', {
                          onSave: async () => {},
                        }),
                      )
                    }
                  >
                    Start using OpenID
                  </Button>
                  <Label
                    style={{ paddingTop: 5 }}
                    title="OpenID is required to enable multi-user mode."
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
                        pushModal('enable-password-auth', {
                          onSave: async () => {},
                        }),
                      )
                    }
                  >
                    Disable OpenID
                  </Button>
                  {multiuserEnabled && (
                    <label style={{ paddingTop: 5, color: theme.warningText }}>
                      Disabling OpenID will deactivate multi-user mode.
                    </label>
                  )}
                </>
              )}
            </>
          }
        >
          <Text>
            <strong>Authentication method</strong> modifies how users log in to
            the system.
          </Text>
        </Setting>
      )}
    </View>
  );
}
