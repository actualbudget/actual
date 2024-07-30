// @ts-strict-ignore
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';
import { listen } from 'loot-core/src/platform/client/fetch';

import { useActions } from '../hooks/useActions';
import { theme, styles, type CSSProperties } from '../style';

import { Button } from './common/Button';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { Text } from './common/Text';
import { View } from './common/View';
import { useServerURL } from './ServerContext';

type LoggedInUserProps = {
  hideIfNoServer?: boolean;
  style?: CSSProperties;
  color?: string;
};
export function LoggedInUser({
  hideIfNoServer,
  style,
  color,
}: LoggedInUserProps) {
  const userData = useSelector((state: State) => state.user.data);
  const { getUserData, signOut, closeBudget } = useActions();
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const serverUrl = useServerURL();
  const triggerRef = useRef(null);

  useEffect(() => {
    getUserData().then(() => setLoading(false));

    const unlisten = listen('sync-event', ({ type }) => {
      console.log(userData?.offline);
      if (type === 'start' && userData?.offline) {
        setLoading(true);
      } else {
        // Give the layout some time to apply the starting animation
        // so we always finish it correctly even if it's almost
        // instant
        getUserData().then(() => (loading ? setLoading(false) : null));
      }
    });

    return unlisten;
  }, [userData, loading]);

  async function onChangePassword() {
    await closeBudget();
    window.__navigate('/change-password');
  }

  async function onMenuSelect(type) {
    setMenuOpen(false);

    switch (type) {
      case 'change-password':
        onChangePassword();
        break;
      case 'sign-in':
        await closeBudget();
        window.__navigate('/login');
        break;
      case 'sign-out':
        signOut();
        break;
      case 'config-server':
        await closeBudget();
        window.__navigate('/config-server');
        break;
      default:
    }
  }

  function serverMessage() {
    if (!serverUrl) {
      return 'No server';
    }

    if (userData?.offline) {
      return 'Server offline';
    }

    return 'Server online';
  }

  if (hideIfNoServer && !serverUrl) {
    return null;
  }

  if (loading && serverUrl) {
    return (
      <Text
        style={{
          color: theme.pageTextLight,
          fontStyle: 'italic',
          ...styles.delayedFadeIn,
          ...style,
        }}
      >
        Connecting...
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', ...style }}>
      <Button
        ref={triggerRef}
        type="bare"
        onClick={() => setMenuOpen(true)}
        style={color && { color }}
      >
        {serverMessage()}
      </Button>

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu
          onMenuSelect={onMenuSelect}
          items={[
            serverUrl &&
              !userData?.offline && {
                name: 'change-password',
                text: 'Change password',
              },
            serverUrl && { name: 'sign-out', text: 'Sign out' },
            {
              name: 'config-server',
              text: serverUrl ? 'Change server URL' : 'Start using a server',
            },
          ]}
        />
      </Popover>
    </View>
  );
}
