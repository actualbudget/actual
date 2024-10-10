// @ts-strict-ignore
import React, { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';

import { useActions } from '../hooks/useActions';
import { theme, styles } from '../style';

import { Button } from './common/Button2';
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
  const { t } = useTranslation();

  const userData = useSelector((state: State) => state.user.data);
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

  function serverMessage() {
    if (!serverUrl) {
      return t('No server');
    }

    if (userData?.offline) {
      return t('Server offline');
    }

    return t('Server online');
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
        <Trans>Connecting...</Trans>
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
                text: t('Change password'),
              },
            serverUrl && { name: 'sign-out', text: t('Sign out') },
            {
              name: 'config-server',
              text: serverUrl
                ? t('Change server URL')
                : t('Start using a server'),
            },
          ]}
        />
      </Popover>
    </View>
  );
}
