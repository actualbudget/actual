import React from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { type AuthMethods } from 'loot-core/types/prefs';

import { theme, theme as themeStyle } from '../../style';
import { Button } from '../common/Button2';
import { Label } from '../common/Label';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { useMultiuserEnabled, useLoginMethod } from '../ServerContext';

import { Setting } from './UI';

export function AuthSettings() {
  const multiuserEnabled = useMultiuserEnabled();
  const loginMethod = useLoginMethod();
  const dispatch = useDispatch();

  return (
    <Setting
      primaryAction={
        <>
          <Select<AuthMethods>
            disabled={true}
            value={loginMethod as AuthMethods}
            options={[
              ['password', 'Password'],
              ['openid', 'OpenID'],
            ]}
            buttonStyle={{
              ':hover': {
                backgroundColor: themeStyle.buttonNormalBackgroundHover,
              },
            }}
          />
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
                Revert to password
              </Button>
              {multiuserEnabled && (
                <Label
                  style={{ paddingTop: 5, color: theme.warningText }}
                  title="Disabling OpenID will deactivate multi-user mode."
                />
              )}
            </>
          )}
        </>
      }
    >
      <Text>
        <strong>Authentication method</strong> modifies how users log in to the
        system.
      </Text>
    </Setting>
  );
}
