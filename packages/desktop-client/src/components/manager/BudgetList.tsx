import type React from 'react';
import { useState, useRef, type CSSProperties } from 'react';
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
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import {
  type File,
  type LocalFile,
  type SyncableLocalFile,
  type SyncedLocalFile,
} from 'loot-core/types/file';

import { useInitialMount } from '../../hooks/useInitialMount';
import { useLocalPref } from '../../hooks/useLocalPref';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import {
  SvgCloudCheck,
  SvgCloudDownload,
  SvgDotsHorizontalTriple,
  SvgFileDouble,
} from '../../icons/v1';
import { SvgCloudUnknown, SvgKey, SvgRefreshArrow } from '../../icons/v2';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { tokens } from '../../tokens';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

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

function FileState({ file }: { file: File }) {
  let Icon;
  let status;
  let color;

  switch (file.state) {
    case 'unknown':
      Icon = SvgCloudUnknown;
      status = 'Network unavailable';
      color = theme.buttonNormalDisabledText;
      break;
    case 'remote':
      Icon = SvgCloudDownload;
      status = 'Available for download';
      break;
    case 'local':
    case 'broken':
      Icon = SvgFileDouble;
      status = 'Local';
      break;
    default:
      Icon = SvgCloudCheck;
      status = 'Syncing';
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
}: {
  file: File;
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
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
      <View style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 16, fontWeight: 700 }}>{file.name}</Text>

        <FileState file={file} />
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
}: {
  files: File[];
  quickSwitchMode: boolean;
  onSelect: (file: File) => void;
  onDelete: (file: File) => void;
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
          No budget files
        </Text>
      ) : (
        files.map(file => (
          <FileItem
            key={isLocalFile(file) ? file.id : file.cloudFileId}
            file={file}
            quickSwitchMode={quickSwitchMode}
            onSelect={onSelect}
            onDelete={onDelete}
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
        quickSwitchMode={quickSwitchMode}
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
            aria-label="Import file"
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
            aria-label="Create new file"
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
              aria-label="Create test file"
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
