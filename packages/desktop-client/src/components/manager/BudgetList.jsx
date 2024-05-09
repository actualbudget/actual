import React, { useState, useRef } from 'react';
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
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';

function getFileDescription(file) {
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

function FileMenu({ onDelete, onClose }) {
  function onMenuSelect(type) {
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

function FileMenuButton({ state, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      <Button
        type="bare"
        aria-label="Menu"
        onClick={e => {
          e.stopPropagation();
          setMenuOpen(true);
        }}
      >
        <SvgDotsHorizontalTriple style={{ width: 16, height: 16 }} />
      </Button>
      {menuOpen && (
        <Tooltip
          position="bottom-right"
          style={{ padding: 0 }}
          onClose={() => setMenuOpen(false)}
        >
          <FileMenu
            state={state}
            onDelete={onDelete}
            onClose={() => setMenuOpen(false)}
          />
        </Tooltip>
      )}
    </View>
  );
}

function FileState({ file }) {
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

function File({ file, quickSwitchMode, onSelect, onDelete }) {
  const selecting = useRef(false);

  async function _onSelect(file) {
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
      title={getFileDescription(file)}
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
          backgroundColor: theme.hover,
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

        {!quickSwitchMode && (
          <FileMenuButton state={file.state} onDelete={() => onDelete(file)} />
        )}
      </View>
    </View>
  );
}

function BudgetFiles({ files, quickSwitchMode, onSelect, onDelete }) {
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
          <File
            key={file.id || file.cloudFileId}
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

function RefreshButton({ style, onRefresh }) {
  const [loading, setLoading] = useState(false);

  async function _onRefresh() {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  }

  const Icon = loading ? AnimatedLoading : SvgRefreshArrow;

  return (
    <Button
      type="bare"
      aria-label="Refresh"
      style={{ padding: 10, ...style }}
      onClick={_onRefresh}
    >
      <Icon style={{ width: 18, height: 18 }} />
    </Button>
  );
}

function BudgetListHeader({ quickSwitchMode, onRefresh }) {
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

  const files = id ? allFiles.filter(f => f.id !== id) : allFiles;

  const [creating, setCreating] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  const onCreate = ({ testMode } = {}) => {
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
        onSelect={file => {
          if (!id) {
            if (file.state === 'remote') {
              dispatch(downloadBudget(file.cloudFileId));
            } else {
              dispatch(loadBudget(file.id));
            }
          } else if (file.id !== id) {
            if (file.state === 'remote') {
              dispatch(closeAndDownloadBudget(file.cloudFileId));
            } else {
              dispatch(closeAndLoadBudget(file.id));
            }
          }
        }}
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
            type="bare"
            style={{
              ...narrowButtonStyle,
              marginLeft: 10,
              color: theme.pageTextLight,
            }}
            onClick={e => {
              e.preventDefault();
              dispatch(pushModal('import'));
            }}
          >
            Import file
          </Button>

          <Button
            type="primary"
            onClick={onCreate}
            style={{
              ...narrowButtonStyle,
              marginLeft: 10,
            }}
          >
            Create new file
          </Button>

          {isNonProductionEnvironment() && (
            <Button
              type="primary"
              isSubmit={false}
              onClick={() => onCreate({ testMode: true })}
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
