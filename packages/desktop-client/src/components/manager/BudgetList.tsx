import type React from 'react';
import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  closeAndDownloadBudget,
  closeAndLoadBudget,
  createBudget,
  downloadBudget,
  getUserData,
  loadAllFiles,
  loadBudget,
  pushModal,
} from 'loot-core/client/actions';
import { send } from 'loot-core/platform/client/fetch';
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import {
  type RemoteFile,
  type File,
  type LocalFile,
  type SyncableLocalFile,
  type SyncedLocalFile,
} from 'loot-core/types/file';
import { type UserEntity } from 'loot-core/types/models';
import { type UserAccessEntity } from 'loot-core/types/models/userAccess';

import { useInitialMount } from '../../hooks/useInitialMount';
import { useLocalPref } from '../../hooks/useLocalPref';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import {
  SvgCloudCheck,
  SvgCloudDownload,
  SvgDotsHorizontalTriple,
  SvgFileDouble,
  SvgUser,
  SvgUserGroup,
} from '../../icons/v1';
import { SvgCloudUnknown, SvgKey, SvgRefreshArrow } from '../../icons/v2';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { tokens } from '../../tokens';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { Tooltip } from '../common/Tooltip';
import { View } from '../common/View';
import { useMultiuserEnabled } from '../ServerContext';

function getFileDescription(file: File) {
  if (file.state === 'unknown') {
    return (
      'This is a cloud-based file but its state is unknown because you ' +
      'are offline.'
    );
  }

  if (file.encryptKeyId) {
    if (file.hasKey) {
      return 'This file is encrypted and you have key to access it.';
    }
    return 'This file is encrypted and you do not have the key for it.';
  }

  return null;
}

function UserAccessForFile({
  fileId,
  currentUserId,
  ownerId,
  usersPerFile,
  style,
}: {
  fileId: string;
  currentUserId: string;
  ownerId?: string;
  usersPerFile: Map<string, UserAccessEntity[]>;
  style?: CSSProperties;
}) {
  let usersAccess = usersPerFile?.has(fileId) ? usersPerFile.get(fileId) : [];
  usersAccess = usersAccess?.filter(user => user.userId !== ownerId) ?? [];

  const sortedUsersAccess = [...usersAccess].sort((a, b) => {
    const textA =
      a.userId === currentUserId ? 'You' : a.displayName ?? a.userName;
    const textB =
      b.userId === currentUserId ? 'You' : b.displayName ?? b.userName;
    return textA.localeCompare(textB);
  });

  return (
    usersAccess.length > 0 && (
      <View
        style={{
          ...style,
          alignSelf: 'center',
        }}
      >
        <Tooltip
          content={
            <View
              style={{
                margin: 5,
              }}
            >
              <Text
                style={{
                  ...styles.altMenuHeaderText,
                  ...styles.verySmallText,
                  color: theme.pageTextLight,
                }}
              >
                File shared with:
              </Text>
              <View
                style={{
                  padding: 0,
                }}
              >
                {sortedUsersAccess.map(user => (
                  <View key={user.userId} style={{ flexDirection: 'row' }}>
                    <SvgUser
                      style={{
                        width: 10,
                        height: 10,
                        opacity: 0.7,
                        marginTop: 3,
                        marginRight: 5,
                      }}
                    />
                    <View
                      style={{
                        ...styles.verySmallText,
                        color: theme.pageTextLight,
                        margin: 0,
                        listStylePosition: 'inside',
                      }}
                    >
                      {user.userId === currentUserId
                        ? 'You'
                        : user.displayName ?? user.userName}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          }
          placement="bottom end"
        >
          <SvgUserGroup
            style={{
              width: 15,
              height: 15,
              alignSelf: 'flex-end',
              opacity: 0.7,
            }}
          />
        </Tooltip>
      </View>
    )
  );
}

function isLocalFile(file: File): file is LocalFile {
  return file.state === 'local';
}

function FileMenu({
  onDelete,
  onClose,
}: {
  onDelete: () => void;
  onClose: () => void;
}) {
  function onMenuSelect(type: string) {
    onClose();

    switch (type) {
      case 'delete':
        onDelete();
        break;
      default:
    }
  }

  const items = [{ name: 'delete', text: 'Delete' }];
  const { isNarrowWidth } = useResponsive();

  const defaultMenuItemStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        color: theme.menuItemText,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};

  return (
    <Menu
      getItemStyle={() => defaultMenuItemStyle}
      onMenuSelect={onMenuSelect}
      items={items}
    />
  );
}

function FileMenuButton({ onDelete }: { onDelete: () => void }) {
  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label="Menu"
        onPress={() => {
          setMenuOpen(true);
        }}
      >
        <SvgDotsHorizontalTriple style={{ width: 16, height: 16 }} />
      </Button>

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <FileMenu onDelete={onDelete} onClose={() => setMenuOpen(false)} />
      </Popover>
    </View>
  );
}

function FileState({
  file,
  users,
  currentUserId,
  isOpenID,
}: {
  file: File;
  users: UserEntity[];
  currentUserId: string;
  isOpenID: boolean;
}) {
  let Icon;
  let status;
  let color;
  let ownerName = null;

  switch (file.state) {
    case 'unknown':
      Icon = SvgCloudUnknown;
      status = 'Network unavailable';
      color = theme.buttonNormalDisabledText;
      ownerName = 'unknown';
      break;
    case 'remote':
      Icon = SvgCloudDownload;
      status = 'Available for download';
      ownerName = isOpenID ? getOwnerDisplayName() : '';
      break;
    case 'local':
      Icon = SvgFileDouble;
      status = 'Local';
      break;

    case 'broken':
      ownerName = 'unknown';
      Icon = SvgFileDouble;
      status = 'Local';
      break;
    default:
      Icon = SvgCloudCheck;
      status = 'Syncing';
      ownerName = isOpenID ? getOwnerDisplayName() : '';
      break;
  }

  const showOwnerContent =
    isOpenID &&
    ownerName !== null &&
    !isLocalFile(file) &&
    file.owner !== currentUserId;

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          color,
          alignItems: 'center',
          flexDirection: 'row',
          marginTop: 8,
        }}
      >
        <Icon
          style={{
            width: 18,
            height: 18,
            color: 'currentColor',
          }}
        />

        <Text style={{ marginLeft: 5 }}>{status}</Text>
      </View>

      <View style={{ paddingTop: 10, flexDirection: 'row', width: '100%' }}>
        {showOwnerContent && (
          <View style={{ flexDirection: 'row' }}>
            <Text
              style={{
                ...styles.altMenuHeaderText,
                ...styles.verySmallText,
                color: theme.pageTextLight,
              }}
            >
              Owner:
            </Text>
            <Text
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
                paddingLeft: 10,
              }}
            >
              {ownerName}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  function getOwnerDisplayName() {
    const userFiltered = users.filter(item => item.id === file.owner);

    if (userFiltered.length > 0) {
      return userFiltered[0].displayName ?? userFiltered[0].userName;
    }
    return null;
  }
}

function FileItem({
  file,
  quickSwitchMode,
  onSelect,
  onDelete,
  users,
  currentUserId,
  usersPerFile,
  isOpenID,
}: {
  file: File;
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
  users: UserEntity[];
  currentUserId: string;
  usersPerFile: Map<string, UserAccessEntity[]>;
  isOpenID: boolean;
}) {
  const selecting = useRef(false);

  async function _onSelect(file: File) {
    // Never allow selecting the file while uploading/downloading, and
    // make sure to never allow duplicate clicks
    if (!selecting.current) {
      selecting.current = true;
      await onSelect(file);
      selecting.current = false;
    }
  }

  return (
    <View
      onClick={() => _onSelect(file)}
      title={getFileDescription(file) || ''}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...styles.shadow,
        margin: 10,
        padding: '12px 15px',
        backgroundColor: theme.buttonNormalBackground,
        borderRadius: 6,
        flexShrink: 0,
        cursor: 'pointer',
        ':hover': {
          backgroundColor: theme.menuItemBackgroundHover,
        },
      }}
    >
      <View style={{ alignItems: 'flex-start', width: '100%' }}>
        <View style={{ flexDirection: 'row', width: '100%' }}>
          <Text style={{ fontSize: 16, fontWeight: 700 }}>{file.name}</Text>
          {isOpenID && (
            <UserAccessForFile
              style={{ marginLeft: '5px' }}
              fileId={(file as RemoteFile).cloudFileId}
              ownerId={file.owner}
              currentUserId={currentUserId}
              usersPerFile={usersPerFile}
            />
          )}
        </View>

        <FileState
          file={file}
          users={users}
          currentUserId={currentUserId}
          isOpenID={isOpenID}
        />
      </View>

      <View
        style={{ flex: '0 0 auto', flexDirection: 'row', alignItems: 'center' }}
      >
        {file.encryptKeyId && (
          <SvgKey
            style={{
              width: 13,
              height: 13,
              marginRight: 8,
              color: file.hasKey
                ? theme.formLabelText
                : theme.buttonNormalDisabledText,
            }}
          />
        )}

        {!quickSwitchMode && <FileMenuButton onDelete={() => onDelete(file)} />}
      </View>
    </View>
  );
}

function BudgetFiles({
  files,
  quickSwitchMode,
  onSelect,
  onDelete,
  users,
  currentUserId,
  usersPerFile,
  isOpenID,
}: {
  files: File[];
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
  users: UserEntity[];
  currentUserId: string;
  usersPerFile: Map<string, UserAccessEntity[]>;
  isOpenID: boolean;
}) {
  return (
    <View
      style={{
        flexGrow: 1,
        [`@media (min-width: ${tokens.breakpoint_small})`]: {
          flexGrow: 0,
        },
        maxHeight: '100%',
        overflow: 'auto',
        '& *': { userSelect: 'none' },
      }}
    >
      {!files || files.length === 0 ? (
        <Text
          style={{
            ...styles.mediumText,
            textAlign: 'center',
            color: theme.pageTextSubdued,
          }}
        >
          No budget files
        </Text>
      ) : (
        files.map(file => (
          <FileItem
            key={isLocalFile(file) ? file.id : file.cloudFileId}
            file={file}
            users={users}
            currentUserId={currentUserId}
            usersPerFile={usersPerFile}
            quickSwitchMode={quickSwitchMode}
            onSelect={onSelect}
            onDelete={onDelete}
            isOpenID={isOpenID}
          />
        ))
      )}
    </View>
  );
}

function RefreshButton({
  style,
  onRefresh,
}: {
  style?: CSSProperties;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function _onRefresh() {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  }

  const Icon = loading ? AnimatedLoading : SvgRefreshArrow;

  return (
    <Button
      variant="bare"
      aria-label="Refresh"
      style={{ padding: 10, ...style }}
      onPress={_onRefresh}
    >
      <Icon style={{ width: 18, height: 18 }} />
    </Button>
  );
}

function BudgetListHeader({
  quickSwitchMode,
  onRefresh,
}: {
  quickSwitchMode: boolean;
  onRefresh: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        margin: 20,
      }}
    >
      <Text
        style={{
          ...styles.veryLargeText,
        }}
      >
        Files
      </Text>
      {!quickSwitchMode && <RefreshButton onRefresh={onRefresh} />}
    </View>
  );
}

export function BudgetList({ showHeader = true, quickSwitchMode = false }) {
  const dispatch = useDispatch();
  const allFiles = useSelector(state => state.budgets.allFiles || []);
  const [id] = useLocalPref('id');
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const userData = useSelector(state => state.user.data);
  const [usersPerFile, setUsersPerFile] = useState(
    new Map<string, UserAccessEntity[]>(),
  );
  const multiuserEnabled = useMultiuserEnabled();

  useEffect(() => {
    if (multiuserEnabled) {
      if (!userData?.offline) {
        send('users-get').then((data: UserEntity[]) => {
          setUsers(data);
          setCurrentUserId(userData?.userId ?? '');
        });
        send(
          'users-get-access',
          allFiles
            .filter(file => !isLocalFile(file))
            .map(
              file =>
                (file as RemoteFile | SyncedLocalFile | SyncableLocalFile)
                  .cloudFileId,
            ),
        ).then((data: Map<string, UserAccessEntity[]>) => {
          setUsersPerFile(data);
        });
      }
    }
  }, [multiuserEnabled, userData?.offline, allFiles, userData?.userId]);

  // Remote files do not have the 'id' field
  function isNonRemoteFile(
    file: File,
  ): file is LocalFile | SyncableLocalFile | SyncedLocalFile {
    return file.state !== 'remote';
  }
  const nonRemoteFiles = allFiles.filter(isNonRemoteFile);
  const files = id ? nonRemoteFiles.filter(f => f.id !== id) : allFiles;

  const [creating, setCreating] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  const onCreate = ({ testMode = false } = {}) => {
    if (!creating) {
      setCreating(true);
      dispatch(createBudget({ testMode }));
    }
  };

  const refresh = () => {
    dispatch(getUserData());
    dispatch(loadAllFiles());
  };

  const initialMount = useInitialMount();
  if (initialMount && quickSwitchMode) {
    refresh();
  }

  const onSelect = (file: File): void => {
    const isRemoteFile = file.state === 'remote';

    if (!id) {
      if (isRemoteFile) {
        dispatch(downloadBudget(file.cloudFileId));
      } else {
        dispatch(loadBudget(file.id));
      }
    } else if (!isRemoteFile && file.id !== id) {
      dispatch(closeAndLoadBudget(file.id));
    } else if (isRemoteFile) {
      dispatch(closeAndDownloadBudget(file.cloudFileId));
    }
  };

  return (
    <View
      style={{
        maxHeight: '100%',
        flex: 1,
        justifyContent: 'center',
        ...(!quickSwitchMode && {
          marginTop: 20,
          width: '100vw',
        }),
        [`@media (min-width: ${tokens.breakpoint_small})`]: {
          maxWidth: tokens.breakpoint_small,
          width: '100%',
        },
      }}
    >
      {showHeader && (
        <BudgetListHeader
          quickSwitchMode={quickSwitchMode}
          onRefresh={refresh}
        />
      )}
      <BudgetFiles
        files={files}
        users={users}
        usersPerFile={usersPerFile}
        currentUserId={currentUserId}
        quickSwitchMode={quickSwitchMode}
        isOpenID={multiuserEnabled}
        onSelect={onSelect}
        onDelete={file => dispatch(pushModal('delete-budget', { file }))}
      />
      {!quickSwitchMode && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: 25,
          }}
        >
          <Button
            variant="bare"
            style={{
              ...narrowButtonStyle,
              marginLeft: 10,
              color: theme.pageTextLight,
            }}
            onPress={() => {
              dispatch(pushModal('import'));
            }}
          >
            Import file
          </Button>

          <Button
            variant="primary"
            onPress={() => onCreate()}
            style={{
              ...narrowButtonStyle,
              marginLeft: 10,
            }}
          >
            Create new file
          </Button>

          {isNonProductionEnvironment() && (
            <Button
              variant="primary"
              onPress={() => onCreate({ testMode: true })}
              style={{
                ...narrowButtonStyle,
                marginLeft: 10,
              }}
            >
              Create test file
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
