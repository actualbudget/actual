// @ts-strict-ignore
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';

import { useActions } from '../hooks/useActions';
import { useNavigate } from '../hooks/useNavigate';
import { theme, styles, type CSSProperties } from '../style';

import { Button } from './common/Button';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { Text } from './common/Text';
import { View } from './common/View';
import { BlurredOverlay } from './PrivacyFilter';
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
  const navigate = useNavigate();

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
      case 'users':
        navigate('/users');
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

      {!loading && userData.userName && (
        <small>
          (logged as:{' '}
          <BlurredOverlay blurIntensity="0.15rem">
            <span>{userData.userName}</span>
          </BlurredOverlay>
          )
        </small>
      )}

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
            serverUrl &&
              !userData?.offline && { name: 'users', text: 'User Management' },
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
