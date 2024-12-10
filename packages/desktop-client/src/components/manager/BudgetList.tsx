import React, { useState, useRef, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
import {
  isElectron,
  isNonProductionEnvironment,
} from 'loot-core/src/shared/environment';
import {
  type File,
  type LocalFile,
  type SyncableLocalFile,
  type SyncedLocalFile,
} from 'loot-core/types/file';

import { useInitialMount } from '../../hooks/useInitialMount';
import { useMetadataPref } from '../../hooks/useMetadataPref';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import {
  SvgCloudCheck,
  SvgCloudDownload,
  SvgCog,
  SvgDotsHorizontalTriple,
  SvgFileDouble,
} from '../../icons/v1';
import { SvgCloudUnknown, SvgKey, SvgRefreshArrow } from '../../icons/v2';
import { styles, theme } from '../../style';
import { tokens } from '../../tokens';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useResponsive } from '../responsive/ResponsiveProvider';

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

function FileMenu({
  onDelete,
  onClose,
  onDuplicate,
}: {
  onDelete: () => void;
  onClose: () => void;
  onDuplicate?: () => void;
}) {
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

function FileMenuButton({
  onDelete,
  onDuplicate,
}: {
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
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
        <FileMenu
          onDelete={onDelete}
          onClose={() => setMenuOpen(false)}
          onDuplicate={onDuplicate}
        />
      </Popover>
    </View>
  );
}

function FileState({ file }: { file: File }) {
  const { t } = useTranslation();

  let Icon;
  let status;
  let color;

  switch (file.state) {
    case 'unknown':
      Icon = SvgCloudUnknown;
      status = t('Network unavailable');
      color = theme.buttonNormalDisabledText;
      break;
    case 'remote':
      Icon = SvgCloudDownload;
      status = t('Available for download');
      break;
    case 'local':
    case 'broken':
      Icon = SvgFileDouble;
      status = t('Local');
      break;
    default:
      Icon = SvgCloudCheck;
      status = t('Syncing');
      break;
  }

  return (
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
  );
}

function FileItem({
  file,
  quickSwitchMode,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  file: File;
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
  onDuplicate: (file: File) => void;
}) {
  const { t } = useTranslation();

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
    <Button
      onPress={() => _onSelect(file)}
      style={{
        ...styles.shadow,
        margin: 10,
        padding: '12px 15px',
        cursor: 'pointer',
        borderRadius: 6,
        borderColor: 'transparent',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View
          title={getFileDescription(file, t) || ''}
          style={{ alignItems: 'flex-start' }}
        >
          <Text style={{ fontSize: 16, fontWeight: 700 }}>{file.name}</Text>

          <FileState file={file} />
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
            <FileMenuButton
              onDelete={() => onDelete(file)}
              onDuplicate={'id' in file ? () => onDuplicate(file) : undefined}
            />
          )}
        </View>
      </View>
    </Button>
  );
}

function BudgetFiles({
  files,
  quickSwitchMode,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  files: File[];
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
  onDuplicate: (file: File) => void;
}) {
  function isLocalFile(file: File): file is LocalFile {
    return file.state === 'local';
  }

  return (
    <View
      style={{
        flexGrow: 1,
        [`@media (min-width: ${tokens.breakpoint_small})`]: {
          flexGrow: 0,
          maxHeight: 310,
        },
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
          <Trans>No budget files</Trans>
        </Text>
      ) : (
        files.map(file => (
          <FileItem
            key={isLocalFile(file) ? file.id : file.cloudFileId}
            file={file}
            quickSwitchMode={quickSwitchMode}
            onSelect={onSelect}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
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

function SettingsButton({ onOpenSettings }: { onOpenSettings: () => void }) {
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

function BudgetListHeader({
  quickSwitchMode,
  onRefresh,
  onOpenSettings,
}: {
  quickSwitchMode: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
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

export function BudgetList({ showHeader = true, quickSwitchMode = false }) {
  const dispatch = useDispatch();
  const allFiles = useSelector(state => state.budgets.allFiles || []);
  const [id] = useMetadataPref('id');

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

  const onSelect = async (file: File): Promise<void> => {
    const isRemoteFile = file.state === 'remote';

    if (!id) {
      if (isRemoteFile) {
        await dispatch(downloadBudget(file.cloudFileId));
      } else {
        await dispatch(loadBudget(file.id));
      }
    } else if (!isRemoteFile && file.id !== id) {
      await dispatch(closeAndLoadBudget(file.id));
    } else if (isRemoteFile) {
      await dispatch(closeAndDownloadBudget(file.cloudFileId));
    }
  };

  return (
    <View
      style={{
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
          onOpenSettings={() => dispatch(pushModal('files-settings'))}
        />
      )}
      <BudgetFiles
        files={files}
        quickSwitchMode={quickSwitchMode}
        onSelect={onSelect}
        onDelete={(file: File) =>
          dispatch(pushModal('delete-budget', { file }))
        }
        onDuplicate={(file: File) => {
          if (file && 'id' in file) {
            dispatch(pushModal('duplicate-budget', { file, managePage: true }));
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
              dispatch(pushModal('import'));
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
