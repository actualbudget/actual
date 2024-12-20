// @ts-strict-ignore
import React, { useState, useEffect, useRef, useMemo, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { closeBudget, getUserData, signOut } from 'loot-core/client/actions';
import { type State } from 'loot-core/src/client/state-types';

import { useNavigate } from '../hooks/useNavigate';
import { theme, styles } from '../style';

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
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state: State) => state.user.data);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const serverUrl = useServerURL();
  const triggerRef = useRef(null);

  useEffect(() => {
    async function init() {
      await dispatch(getUserData());
    }

    init().then(() => setLoading(false));
  }, []);

  async function onCloseBudget() {
    await dispatch(closeBudget());
  }

  async function onChangePassword() {
    await onCloseBudget();
    navigate('/change-password');
  }

  async function onMenuSelect(type) {
    setMenuOpen(false);

    switch (type) {
      case 'change-password':
        onChangePassword();
        break;
      case 'sign-in':
        await onCloseBudget();
        navigate('/login');
        break;
      case 'sign-out':
        dispatch(signOut());
        break;
      case 'config-server':
        await onCloseBudget();
        navigate('/config-server');
        break;
      default:
    }
  }

  const serverMessage = useMemo(() => {
    if (!serverUrl) {
      return t('No server');
    }

    if (syncState === 'offline') {
      return t('Server offline');
    }

    return t('Server online');
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
        {serverMessage}
      </Button>

      <Popover
        offset={8}
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
