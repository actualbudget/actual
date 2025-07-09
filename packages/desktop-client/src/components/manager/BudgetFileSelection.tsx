import React, {
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  useCallback,
  type ComponentPropsWithoutRef,
} from 'react';
import { GridList, GridListItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import {
  SvgCloudCheck,
  SvgCloudDownload,
  SvgCog,
  SvgDotsHorizontalTriple,
  SvgFileDouble,
  SvgUser,
  SvgUserGroup,
} from '@actual-app/components/icons/v1';
import {
  SvgCloudUnknown,
  SvgKey,
  SvgRefreshArrow,
} from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  isElectron,
  isNonProductionEnvironment,
} from 'loot-core/shared/environment';
import {
  type RemoteFile,
  type File,
  type LocalFile,
  type SyncableLocalFile,
  type SyncedLocalFile,
} from 'loot-core/types/file';

import {
  closeAndDownloadBudget,
  closeAndLoadBudget,
  createBudget,
  downloadBudget,
  loadAllFiles,
  loadBudget,
} from '@desktop-client/budgets/budgetsSlice';
import { useMultiuserEnabled } from '@desktop-client/components/ServerContext';
import { useInitialMount } from '@desktop-client/hooks/useInitialMount';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';
import { getUserData } from '@desktop-client/users/usersSlice';

function getFileDescription(file: File, t: (key: string) => string) {
  if (file.state === 'unknown') {
    return t(
      'This is a cloud-based file but its state is unknown because you ' +
        'are offline.',
    );
  }

  if (file.encryptKeyId) {
    if (file.hasKey) {
      return t('This file is encrypted and you have key to access it.');
    }
    return t('This file is encrypted and you do not have the key for it.');
  }

  return null;
}

function isLocalFile(file: File): file is LocalFile {
  return file.state === 'local';
}

type BudgetFileMenuProps = {
  onDelete: () => void;
  onClose: () => void;
  onDuplicate?: () => void;
};

function BudgetFileMenu({
  onDelete,
  onClose,
  onDuplicate,
}: BudgetFileMenuProps) {
  function onMenuSelect(type: string) {
    onClose();

    switch (type) {
      case 'delete':
        onDelete();
        break;
      case 'duplicate':
        if (onDuplicate) onDuplicate();
        break;
      default:
    }
  }

  const { t } = useTranslation();

  const items = [
    ...(onDuplicate ? [{ name: 'duplicate', text: t('Duplicate') }] : []),
    { name: 'delete', text: t('Delete') },
  ];

  return <Menu onMenuSelect={onMenuSelect} items={items} />;
}

type BudgetFileMenuButtonProps = {
  onDelete: () => void;
  onDuplicate?: () => void;
};

function BudgetFileMenuButton({
  onDelete,
  onDuplicate,
}: BudgetFileMenuButtonProps) {
  const { t } = useTranslation();

  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Menu')}
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
        <BudgetFileMenu
          onDelete={onDelete}
          onClose={() => setMenuOpen(false)}
          onDuplicate={onDuplicate}
        />
      </Popover>
    </View>
  );
}

type BudgetFileStateProps = {
  file: File;
  currentUserId: string;
};

function BudgetFileState({ file, currentUserId }: BudgetFileStateProps) {
  const { t } = useTranslation();
  const multiuserEnabled = useMultiuserEnabled();

  let Icon;
  let status;
  let color;
  let ownerName = null;

  const getOwnerDisplayName = useCallback(() => {
    if ('usersWithAccess' in file) {
      const userFound = file.usersWithAccess?.find(f => f.owner);

      if (userFound?.userName === '') {
        return 'Server';
      }

      return userFound?.displayName ?? userFound?.userName ?? t('Unassigned');
    }

    return t('Unknown');
  }, [file, t]);

  switch (file.state) {
    case 'unknown':
      Icon = SvgCloudUnknown;
      status = t('Network unavailable');
      color = theme.buttonNormalDisabledText;
      ownerName = t('Unknown');
      break;
    case 'remote':
      Icon = SvgCloudDownload;
      status = t('Available for download');
      ownerName = getOwnerDisplayName();
      break;
    case 'local':
      Icon = SvgFileDouble;
      status = t('Local');
      ownerName = t('You');
      break;
    case 'broken':
      ownerName = 'unknown';
      Icon = SvgFileDouble;
      status = t('Local');
      ownerName = t('You');
      break;
    default:
      Icon = SvgCloudCheck;
      status = t('Syncing');
      ownerName = getOwnerDisplayName();
      break;
  }

  const showOwnerContent = multiuserEnabled && file.owner !== currentUserId;

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
              <Trans>Owner:</Trans>
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
}

type BudgetFileListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<File>
> & {
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
  onDuplicate: (file: File) => void;
  currentUserId: string;
};

function BudgetFileListItem({
  quickSwitchMode,
  onSelect,
  onDelete,
  onDuplicate,
  currentUserId,
  ...props
}: BudgetFileListItemProps) {
  const { t } = useTranslation();
  const multiuserEnabled = useMultiuserEnabled();

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

  const { value: file } = props;

  if (!file) {
    return null;
  }

  return (
    <GridListItem
      textValue={file.name}
      onAction={() => _onSelect(file)}
      {...props}
    >
      <View
        className={css({
          ...styles.shadow,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '5px 10px',
          padding: 15,
          cursor: 'pointer',
          borderRadius: 6,
          backgroundColor: theme.buttonNormalBackground,
          '&:hover': {
            backgroundColor: theme.buttonNormalBackgroundHover,
          },
        })}
      >
        <View
          title={getFileDescription(file, t) || ''}
          style={{ alignItems: 'flex-start', width: '100%' }}
        >
          <View style={{ flexDirection: 'row', width: '100%' }}>
            <Text style={{ fontSize: 16, fontWeight: 700 }}>{file.name}</Text>
            {multiuserEnabled && 'cloudFileId' in file && (
              <UserAccessForFile
                fileId={file.cloudFileId}
                currentUserId={currentUserId}
              />
            )}
          </View>

          <BudgetFileState file={file} currentUserId={currentUserId} />
        </View>

        <View
          style={{
            flex: '0 0 auto',
            flexDirection: 'row',
            alignItems: 'center',
          }}
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

          {!quickSwitchMode && (
            <BudgetFileMenuButton
              onDelete={() => onDelete(file)}
              onDuplicate={'id' in file ? () => onDuplicate(file) : undefined}
            />
          )}
        </View>
      </View>
    </GridListItem>
  );
}

type BudgetFileListProps = {
  files: File[];
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
  onDuplicate: (file: File) => void;
  currentUserId: string;
};

function BudgetFileList({
  files,
  quickSwitchMode,
  onSelect,
  onDelete,
  onDuplicate,
  currentUserId,
}: BudgetFileListProps) {
  const { t } = useTranslation();
  return (
    <GridList
      aria-label={t('Budget files')}
      items={files}
      style={{
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      renderEmptyState={() => (
        <Text
          style={{
            ...styles.mediumText,
            textAlign: 'center',
            color: theme.pageTextSubdued,
          }}
        >
          <Trans>No budget files</Trans>
        </Text>
      )}
    >
      {file => {
        const id = isLocalFile(file) ? file.id : file.cloudFileId;
        return (
          <BudgetFileListItem
            key={id}
            id={id}
            value={file}
            currentUserId={currentUserId}
            quickSwitchMode={quickSwitchMode}
            onSelect={onSelect}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        );
      }}
    </GridList>
  );
}

type RefreshButtonProps = {
  style?: CSSProperties;
  onRefresh: () => void;
};

function RefreshButton({ style, onRefresh }: RefreshButtonProps) {
  const { t } = useTranslation();

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
      aria-label={t('Refresh')}
      style={{ padding: 10, ...style }}
      onPress={_onRefresh}
    >
      <Icon style={{ width: 18, height: 18 }} />
    </Button>
  );
}

type SettingsButtonProps = {
  onOpenSettings: () => void;
};

function SettingsButton({ onOpenSettings }: SettingsButtonProps) {
  const { t } = useTranslation();

  return (
    <View>
      <Button
        variant="bare"
        aria-label={t('Settings')}
        onPress={() => {
          onOpenSettings();
        }}
        style={{ padding: 10 }}
      >
        <SvgCog style={{ width: 18, height: 18 }} />
      </Button>
    </View>
  );
}

type BudgetFileSelectionHeaderProps = {
  quickSwitchMode: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
};

function BudgetFileSelectionHeader({
  quickSwitchMode,
  onRefresh,
  onOpenSettings,
}: BudgetFileSelectionHeaderProps) {
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
        <Trans>Files</Trans>
      </Text>
      {!quickSwitchMode && (
        <View
          style={{
            flexDirection: 'row',
            gap: '0.2rem',
          }}
        >
          <RefreshButton onRefresh={onRefresh} />
          {isElectron() && <SettingsButton onOpenSettings={onOpenSettings} />}
        </View>
      )}
    </View>
  );
}

type BudgetFileSelectionProps = {
  showHeader?: boolean;
  quickSwitchMode?: boolean;
};

export function BudgetFileSelection({
  showHeader = true,
  quickSwitchMode = false,
}: BudgetFileSelectionProps) {
  const dispatch = useDispatch();
  const allFiles = useSelector(state => state.budgets.allFiles || []);
  const multiuserEnabled = useMultiuserEnabled();
  const [id] = useMetadataPref('id');
  const [currentUserId, setCurrentUserId] = useState('');
  const userData = useSelector(state => state.user.data);

  const fetchUsers = useCallback(async () => {
    try {
      setCurrentUserId(userData?.userId ?? '');
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, [userData?.userId]);

  useEffect(() => {
    if (multiuserEnabled && !userData?.offline) {
      fetchUsers();
    }
  }, [multiuserEnabled, userData?.offline, fetchUsers]);

  // Remote files do not have the 'id' field
  function isNonRemoteFile(
    file: File,
  ): file is LocalFile | SyncableLocalFile | SyncedLocalFile {
    return file.state !== 'remote';
  }

  // Filter out the open file
  const files = id
    ? allFiles.filter(file => !isNonRemoteFile(file) || file.id !== id)
    : allFiles;

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

  const onSelect = async (file: File): Promise<void> => {
    const isRemoteFile = file.state === 'remote';

    if (!id) {
      if (isRemoteFile) {
        await dispatch(downloadBudget({ cloudFileId: file.cloudFileId }));
      } else {
        await dispatch(loadBudget({ id: file.id }));
      }
    } else if (!isRemoteFile && file.id !== id) {
      await dispatch(closeAndLoadBudget({ fileId: file.id }));
    } else if (isRemoteFile) {
      await dispatch(closeAndDownloadBudget({ cloudFileId: file.cloudFileId }));
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
        <BudgetFileSelectionHeader
          quickSwitchMode={quickSwitchMode}
          onRefresh={refresh}
          onOpenSettings={() =>
            dispatch(pushModal({ modal: { name: 'files-settings' } }))
          }
        />
      )}
      <BudgetFileList
        files={files}
        currentUserId={currentUserId}
        quickSwitchMode={quickSwitchMode}
        onSelect={onSelect}
        onDelete={(file: File) =>
          dispatch(
            pushModal({ modal: { name: 'delete-budget', options: { file } } }),
          )
        }
        onDuplicate={(file: File) => {
          if (file && 'id' in file) {
            dispatch(
              pushModal({
                modal: {
                  name: 'duplicate-budget',
                  options: { file, managePage: true },
                },
              }),
            );
          } else {
            console.error(
              'Attempted to duplicate a cloud file - only local files are supported. Cloud file:',
              file,
            );
          }
        }}
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
              dispatch(pushModal({ modal: { name: 'import' } }));
            }}
          >
            <Trans>Import file</Trans>
          </Button>

          <Button
            variant="primary"
            onPress={() => onCreate()}
            style={{
              ...narrowButtonStyle,
              marginLeft: 10,
            }}
          >
            <Trans>Create new file</Trans>
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
              <Trans>Create test file</Trans>
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

type UserAccessForFileProps = {
  fileId: string;
  currentUserId: string;
};

function UserAccessForFile({ fileId, currentUserId }: UserAccessForFileProps) {
  const { t } = useTranslation();

  const allFiles = useSelector(state => state.budgets.allFiles || []);
  const remoteFiles = allFiles.filter(
    f => f.state === 'remote' || f.state === 'synced' || f.state === 'detached',
  ) as (SyncedLocalFile | RemoteFile)[];
  const currentFile = remoteFiles.find(f => f.cloudFileId === fileId);
  const multiuserEnabled = useMultiuserEnabled();

  let usersAccess = currentFile?.usersWithAccess ?? [];
  usersAccess = usersAccess?.filter(user => user.userName !== '') ?? [];

  const sortedUsersAccess = [...usersAccess].sort((a, b) => {
    const textA =
      a.userId === currentUserId ? t('You') : (a.displayName ?? a.userName);
    const textB =
      b.userId === currentUserId ? t('You') : (b.displayName ?? b.userName);
    return textA.localeCompare(textB);
  });

  return (
    <View>
      {multiuserEnabled &&
        usersAccess.length > 0 &&
        !(sortedUsersAccess.length === 1 && sortedUsersAccess[0].owner) && (
          <View
            style={{
              marginLeft: '5px',
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
                            ? t('You')
                            : (user.displayName ?? user.userName)}
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
        )}
    </View>
  );
}
