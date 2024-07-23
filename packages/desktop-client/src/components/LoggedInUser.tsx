import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { type State } from 'loot-core/src/client/state-types';

import { useActions } from '../hooks/useActions';
import { useLocalPref } from '../hooks/useLocalPref';
import { useNavigate } from '../hooks/useNavigate';
import { theme, styles, type CSSProperties } from '../style';

import { Button } from './common/Button';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { Text } from './common/Text';
import { View } from './common/View';
import { useServerURL } from './ServerContext';
import { useAuth } from '../auth/AuthProvider';
import { Permissions } from '../auth/types';
import { send } from 'loot-core/platform/client/fetch';

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
  const [budgetId] = useLocalPref('id');
  const [cloudFileId] = useLocalPref('cloudFileId');
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    getUserData().then(() => setLoading(false));
  }, [getUserData]);

  useEffect(() => {
    if (cloudFileId) {
      send('check-file-access', cloudFileId).then(({ granted }) =>
        setIsOwner(granted),
      );
    }
  }, [cloudFileId]);

  const handleMenuSelect = async (type: string) => {
    setMenuOpen(false);

    switch (type) {
      case 'change-password':
        await closeBudget();
        window.__navigate('/change-password');
        break;
      case 'sign-in':
        await closeBudget();
        window.__navigate('/login');
        break;
      case 'user-access':
        navigate('/user-access');
        break;
      case 'user-directory':
        navigate('/user-directory');
        break;
      case 'index':
        navigate('/');
        break;
      case 'sign-out':
        signOut();
        break;
      case 'config-server':
        await closeBudget();
        window.__navigate('/config-server');
        break;
      default:
        break;
    }
  };

  const serverMessage = () => {
    if (!serverUrl) return 'No server';
    if (userData?.offline) return 'Server offline';
    return 'Server online';
  };

  if (hideIfNoServer && !serverUrl) return null;

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

  const getMenuItems = () => {
    const isAdmin = hasPermission(Permissions.ADMINISTRATOR);
    const baseMenu = [
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
    ];

    const adminMenu = [];
    if (isAdmin) {
      if (!budgetId && location.pathname !== '/') {
        adminMenu.push({ name: 'index', text: 'View file list' });
      } else if (serverUrl && !userData?.offline && !budgetId) {
        adminMenu.push({ name: 'user-directory', text: 'User Directory' });
      }
    }

    if (
      (isOwner || isAdmin) &&
      serverUrl &&
      !userData?.offline &&
      budgetId &&
      location.pathname !== '/user-access'
    ) {
      adminMenu.push({ name: 'user-access', text: 'User Access Management' });
    }

    if (adminMenu.length > 0) {
      adminMenu.push(Menu.line);
    }

    return [...adminMenu, ...baseMenu];
  };

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

      {!loading && userData?.userName && (
        <small>
          (logged as: <span>{userData?.displayName}</span>)
        </small>
      )}

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu onMenuSelect={handleMenuSelect} items={getMenuItems()} />
      </Popover>
    </View>
  );
}
