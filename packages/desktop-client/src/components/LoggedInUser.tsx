import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { send } from 'loot-core/platform/client/fetch';
import { type State } from 'loot-core/src/client/state-types';

import { useAuth } from '../auth/AuthProvider';
import { Permissions } from '../auth/types';
import { useActions } from '../hooks/useActions';
import { useLocalPref } from '../hooks/useLocalPref';
import { useNavigate } from '../hooks/useNavigate';
import { theme, styles, type CSSProperties } from '../style';

import { Button } from './common/Button';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { Text } from './common/Text';
import { View } from './common/View';
import { useMultiuserEnabled, useServerURL } from './ServerContext';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [budgetId] = useLocalPref('id');
  const [cloudFileId] = useLocalPref('cloudFileId');
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const multiuserEnabled = useMultiuserEnabled();

  useEffect(() => {
    getUserData().then(() => setLoading(false));
  }, [getUserData]);

  useEffect(() => {
    if (cloudFileId) {
      send('check-file-access', cloudFileId).then(
        ({ granted }: { granted: boolean }) => setIsOwner(granted),
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

  type MenuItem = {
    name: string;
    text: string;
  };

  const getMenuItems = (): (MenuItem | typeof Menu.line)[] => {
    const isAdmin = hasPermission(Permissions.ADMINISTRATOR);

    const baseMenu: (MenuItem | typeof Menu.line)[] = [];
    if (
      serverUrl &&
      !userData?.offline &&
      userData?.loginMethod === 'password'
    ) {
      baseMenu.push({ name: 'change-password', text: 'Change password' });
    }
    if (serverUrl) {
      baseMenu.push({ name: 'sign-out', text: 'Sign out' });
    }
    baseMenu.push({
      name: 'config-server',
      text: serverUrl ? 'Change server URL' : 'Start using a server',
    });

    const adminMenu: (MenuItem | typeof Menu.line)[] = [];
    if (multiuserEnabled && isAdmin) {
      if (!budgetId && location.pathname !== '/') {
        adminMenu.push({ name: 'index', text: 'View file list' });
      } else if (serverUrl && !userData?.offline && !budgetId) {
        adminMenu.push({ name: 'user-directory', text: 'User Directory' });
      }
    }

    if (
      multiuserEnabled &&
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
        style={color ? { color } : undefined}
      >
        {serverMessage()}
      </Button>

      {!loading && multiuserEnabled && userData?.userName && (
        <small>
          (logged as: <span>{userData?.displayName}</span>)
        </small>
      )}

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu
          onMenuSelect={handleMenuSelect}
          items={getMenuItems().filter(Boolean)}
        />
      </Popover>
    </View>
  );
}
