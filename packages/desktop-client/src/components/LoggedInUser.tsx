import React, { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { closeBudget, getUserData, signOut } from 'loot-core/client/actions';
import { type State } from 'loot-core/src/client/state-types';
import { type RemoteFile, type SyncedLocalFile } from 'loot-core/types/file';

import { useAuth } from '../auth/AuthProvider';
import { Permissions } from '../auth/types';
import { useMetadataPref } from '../hooks/useMetadataPref';
import { useNavigate } from '../hooks/useNavigate';
import { theme, styles } from '../style';

import { Button } from './common/Button2';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { Text } from './common/Text';
import { View } from './common/View';
import { PrivacyFilter } from './PrivacyFilter';
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
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state: State) => state.user.data);
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
  const hasSyncedPrefs = useSelector((state: State) => state.prefs.synced);

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
            <Trans>
              (logged in as: <span>{userData?.displayName}</span>)
            </Trans>
          </small>
        )}
      {!loading &&
        multiuserEnabled &&
        userData &&
        userData?.displayName &&
        hasSyncedPrefs && (
          <small>
            <Trans>
              (logged in as:{' '}
              <span>
                <PrivacyFilter>{userData?.displayName}</PrivacyFilter>
              </span>
              )
            </Trans>
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
