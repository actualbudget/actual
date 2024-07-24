import React, { useEffect, useState } from 'react';

import { AuthMethods } from 'loot-core/types/prefs';

import { theme, theme as themeStyle } from '../../style';
import { Select } from '../common/Select';
import { Text } from '../common/Text';

import { Setting } from './UI';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { useDispatch } from 'react-redux';
import { pushModal } from 'loot-core/client/actions';
import { useMultiuserEnabled, useLoginMethod } from '../ServerContext';

export function AuthSettings() {
  const multiuserEnabled     = useMultiuserEnabled();
  const loginMethod = useLoginMethod();
  const dispatch = useDispatch();

  return (
    <Setting
      primaryAction={
        <>
          <Select<AuthMethods>
            onChange={value => {}}
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
          {!multiuserEnabled && (
            <>
              <Button
                id="start-using"
                style={{
                  marginTop: '10px',
                }}
                type="normal"
                onClick={() =>
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
          {multiuserEnabled && (
            <>
              <Button
                style={{
                  marginTop: '10px',
                }}
                type="normal"
                onClick={() =>
                    dispatch(
                      pushModal('enable-password-auth', {
                        onSave: async () => {},
                      }),
                    )
                  }
              >
                Revert to password
              </Button>
              <Label
                style={{ paddingTop: 5, color: theme.warningText }}
                title="Disabling OpenID will deactivate multi-user mode."
              />
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
