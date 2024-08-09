// @ts-strict-ignore
import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useActions } from '../hooks/useActions';
import { theme, styles, type CSSProperties } from '../style';

import { Button } from './common/Button2';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { Text } from './common/Text';
import { View } from './common/View';
import { useServerURL } from './ServerContext';

type LoggedInUserProps = {
  hideIfNoServer?: boolean;
  syncState: null | 'offline' | 'local' | 'disabled' | 'error';
  style?: CSSProperties;
  color?: string;
};
export function LoggedInUser({
  hideIfNoServer,
  syncState,
  style,
  color,
}: LoggedInUserProps) {
  const { getUserData, signOut, closeBudget } = useActions();
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const serverUrl = useServerURL();
  const triggerRef = useRef(null);

  useEffect(() => {
    getUserData().then(() => setLoading(false));
  }, []);

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

  const serverMessage = useMemo(() => {
    if (!serverUrl) {
      return 'No server';
    }

    if (syncState === 'offline') {
      return 'Server offline';
    }

    return 'Server online';
  }, [serverUrl, syncState]);

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
        variant="bare"
        onPress={() => setMenuOpen(true)}
        style={color && { color }}
      >
        {serverMessage}
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
              syncState === null && {
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
