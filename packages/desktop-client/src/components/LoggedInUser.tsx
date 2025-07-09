import React, { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { listen } from 'loot-core/platform/client/fetch';
import { type RemoteFile, type SyncedLocalFile } from 'loot-core/types/file';
import { type TransObjectLiteral } from 'loot-core/types/util';

import { PrivacyFilter } from './PrivacyFilter';
import { useMultiuserEnabled, useServerURL } from './ServerContext';

import { useAuth } from '@desktop-client/auth/AuthProvider';
import { Permissions } from '@desktop-client/auth/types';
import { closeBudget } from '@desktop-client/budgets/budgetsSlice';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSelector, useDispatch } from '@desktop-client/redux';
import { getUserData, signOut } from '@desktop-client/users/usersSlice';

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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector(state => state.user.data);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const serverUrl = useServerURL();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [budgetId] = useMetadataPref('id');
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const location = useLocation();
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const allFiles = useSelector(state => state.budgets.allFiles || []);
  const remoteFiles = allFiles.filter(
    f => f.state === 'remote' || f.state === 'synced' || f.state === 'detached',
  ) as (SyncedLocalFile | RemoteFile)[];
  const currentFile = remoteFiles.find(f => f.cloudFileId === cloudFileId);
  const hasSyncedPrefs = useSelector(state => state.prefs.synced);

  const initializeUserData = async () => {
    try {
      await dispatch(getUserData());
    } catch (error) {
      console.error('Failed to initialize user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeUserData();
  }, []);

  useEffect(() => {
    return listen('sync-event', ({ type }) => {
      if (type === 'start') {
        setLoading(true);

        return;
      }

      const shouldReinitialize =
        userData &&
        ((type === 'success' && userData.offline) ||
          (type === 'error' && !userData.offline));

      if (shouldReinitialize) {
        initializeUserData();
      } else {
        setLoading(false);
      }
    });
  }, [userData]);

  async function onCloseBudget() {
    await dispatch(closeBudget());
  }

  async function onChangePassword() {
    await onCloseBudget();
    navigate('/change-password');
  }

  const handleMenuSelect = async (type: string) => {
    setMenuOpen(false);

    switch (type) {
      case 'change-password':
        onChangePassword();
        break;
      case 'sign-in':
        await onCloseBudget();
        navigate('/login');
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
        dispatch(signOut());
        break;
      case 'config-server':
        await onCloseBudget();
        navigate('/config-server');
        break;
      default:
        break;
    }
  };

  function serverMessage() {
    if (!serverUrl) {
      return t('No server');
    }

    if (userData?.offline) {
      return t('Server offline');
    }

    return t('Server online');
  }

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
        <Trans>Connecting...</Trans>
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
      baseMenu.push({ name: 'change-password', text: t('Change password') });
    }
    if (serverUrl) {
      baseMenu.push({ name: 'sign-out', text: t('Sign out') });
    }
    baseMenu.push({
      name: 'config-server',
      text: serverUrl ? t('Change server URL') : t('Start using a server'),
    });

    const adminMenu: (MenuItem | typeof Menu.line)[] = [];
    if (multiuserEnabled && isAdmin) {
      if (!budgetId && location.pathname !== '/') {
        adminMenu.push({ name: 'index', text: t('View file list') });
      } else if (
        serverUrl &&
        !userData?.offline &&
        location.pathname !== '/user-directory'
      ) {
        adminMenu.push({ name: 'user-directory', text: t('User Directory') });
      }
    }

    if (
      multiuserEnabled &&
      ((currentFile && userData && currentFile.owner === userData.userId) ||
        isAdmin) &&
      serverUrl &&
      !userData?.offline &&
      cloudFileId &&
      location.pathname !== '/user-access'
    ) {
      adminMenu.push({
        name: 'user-access',
        text: t('User Access Management'),
      });
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
        variant="bare"
        onPress={() => setMenuOpen(true)}
        style={{ color: color || 'inherit' }}
      >
        {serverMessage()}
      </Button>
      {!loading &&
        multiuserEnabled &&
        userData &&
        userData?.displayName &&
        !hasSyncedPrefs && (
          <small>
            (
            <Trans>
              logged in as:{' '}
              <span>
                {{ userName: userData?.displayName } as TransObjectLiteral}
              </span>
            </Trans>
            )
          </small>
        )}
      {!loading &&
        multiuserEnabled &&
        userData &&
        userData?.displayName &&
        hasSyncedPrefs && (
          <small>
            (
            <Trans>
              logged in as:{' '}
              <span>
                <PrivacyFilter>
                  {{ userName: userData?.displayName } as TransObjectLiteral}
                </PrivacyFilter>
              </span>
            </Trans>
            )
          </small>
        )}

      <Popover
        offset={8}
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
