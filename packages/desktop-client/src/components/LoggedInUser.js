import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';

import { css } from 'glamor';

import * as actions from 'loot-core/src/client/actions';

import { colors } from '../style';

import { View, Text, Button, Tooltip, Menu } from './common';
import { useServerURL } from './ServerContext';

let fade = css.keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 },
});

function LoggedInUser({
  hideIfNoServer,
  userData,
  getUserData,
  signOut,
  closeBudget,
  style,
  color,
}) {
  let [loading, setLoading] = useState(true);
  let [menuOpen, setMenuOpen] = useState(false);
  const serverUrl = useServerURL();

  useEffect(() => {
    getUserData().then(() => setLoading(false));
  }, []);

  async function onChangePassword() {
    await closeBudget();
    window.__history.push('/change-password');
  }

  async function onMenuSelect(type) {
    setMenuOpen(false);

    switch (type) {
      case 'change-password':
        onChangePassword();
        break;
      case 'sign-in':
        await closeBudget();
        window.__history.push('/login');
        break;
      case 'sign-out':
        signOut();
        break;
      case 'config-server':
        await closeBudget();
        window.__history.push('/config-server');
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
        style={[
          {
            color: colors.n5,
            fontStyle: 'italic',
            animationName: fade,
            animationDuration: '0.2s',
            animationFillMode: 'both',
            animationDelay: '0.5s',
          },
          style,
        ]}
      >
        Connecting...
      </Text>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Button bare onClick={() => setMenuOpen(true)} style={{ color }}>
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

export default connect(
  state => ({ userData: state.user.data }),
  actions,
)(withRouter(LoggedInUser));
