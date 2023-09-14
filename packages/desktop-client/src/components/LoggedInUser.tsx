import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '../hooks/useActions';
import { theme, styles, type CSSProperties } from '../style';

import Button from './common/Button';
import Menu from './common/Menu';
import Text from './common/Text';
import View from './common/View';
import { useServerURL } from './ServerContext';
import { Tooltip } from './tooltips';

type LoggedInUserProps = {
  hideIfNoServer?: boolean;
  style?: CSSProperties;
  color?: string;
};
export default function LoggedInUser({
  hideIfNoServer,
  style,
  color,
}: LoggedInUserProps) {
  let userData = useSelector(state => state.user.data);
  let { getUserData, signOut, closeBudget } = useActions();
  let [loading, setLoading] = useState(true);
  let [menuOpen, setMenuOpen] = useState(false);
  const serverUrl = useServerURL();

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
          color: theme.altpageTextSubdued,
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
      <Button type="bare" onClick={() => setMenuOpen(true)} style={{ color }}>
        {serverMessage()}
      </Button>

      {menuOpen && (
        <Tooltip
          position="bottom-right"
          style={{ padding: 0 }}
          onClose={() => setMenuOpen(false)}
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
        </Tooltip>
      )}
    </View>
  );
}
