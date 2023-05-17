import React, { useState, useRef } from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

import Loading from '../../icons/AnimatedLoading';
import CloudCheck from '../../icons/v1/CloudCheck';
import CloudDownload from '../../icons/v1/CloudDownload';
import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import FileDouble from '../../icons/v1/FileDouble';
import CloudUnknown from '../../icons/v2/CloudUnknown';
import Key from '../../icons/v2/Key';
import RefreshArrow from '../../icons/v2/RefreshArrow';
import { styles, colors } from '../../style';
import tokens from '../../tokens';
import { View, Text, Button, Tooltip, Menu } from '../common';

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

  let items = [{ name: 'delete', text: 'Delete' }];

  return <Menu onMenuSelect={onMenuSelect} items={items} />;
}

function DetailButton({ state, onDelete }) {
  let [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      <Button
        bare
        onClick={e => {
          e.stopPropagation();
          setMenuOpen(true);
        }}
      >
        <DotsHorizontalTriple style={{ width: 16, height: 16 }} />
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
      Icon = CloudUnknown;
      status = 'Network unavailable';
      color = colors.n7;
      break;
    case 'remote':
      Icon = CloudDownload;
      status = 'Available for download';
      break;
    case 'local':
    case 'broken':
      Icon = FileDouble;
      status = 'Local';
      break;
    default:
      Icon = CloudCheck;
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
        color={color}
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

function File({ file, onSelect, onDelete }) {
  let selecting = useRef(false);

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
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          ...styles.shadow,
          margin: 10,
          padding: '12px 15px',
          backgroundColor: 'white',
          borderRadius: 6,
          flexShrink: 0,
          cursor: 'pointer',
          ':hover': {
            backgroundColor: colors.hover,
          },
        },
      ]}
    >
      <View style={{ alignItems: 'flex-start' }}>
        <Text style={[{ fontSize: 16, fontWeight: 700 }]}>{file.name}</Text>

        <FileState file={file} />
      </View>

      <View
        style={{ flex: '0 0 auto', flexDirection: 'row', alignItems: 'center' }}
      >
        {file.encryptKeyId && (
          <Key
            style={{
              width: 13,
              height: 13,
              marginRight: 8,
              color: file.hasKey ? colors.b5 : colors.n8,
            }}
          />
        )}

        <DetailButton state={file.state} onDelete={() => onDelete(file)} />
      </View>
    </View>
  );
}

function BudgetTable({ files, onSelect, onDelete }) {
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
      {files.map(file => (
        <File
          key={file.id || file.cloudFileId}
          file={file}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

function RefreshButton({ onRefresh }) {
  let [loading, setLoading] = useState(false);

  async function _onRefresh() {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  }

  let Icon = loading ? Loading : RefreshArrow;

  return (
    <Button bare style={{ padding: 10, marginRight: 5 }} onClick={_onRefresh}>
      <Icon
        color={colors.n1}
        style={{ width: 18, height: 18, color: colors.n1 }}
      />
    </Button>
  );
}

function BudgetList({
  files = [],
  getUserData,
  loadAllFiles,
  pushModal,
  loadBudget,
  createBudget,
  downloadBudget,
}) {
  const [creating, setCreating] = useState(false);

  const onCreate = ({ testMode } = {}) => {
    if (!creating) {
      setCreating(true);
      createBudget({ testMode });
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        marginInline: -20,
        marginTop: 20,
        width: '100vw',
        [`@media (min-width: ${tokens.breakpoint_small})`]: {
          maxWidth: tokens.breakpoint_small,
          width: '100%',
        },
      }}
    >
      <View>
        <Text style={[styles.veryLargeText, { margin: 20 }]}>Files</Text>
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            marginRight: 5,
          }}
        >
          <RefreshButton
            onRefresh={() => {
              getUserData();
              loadAllFiles();
            }}
          />
        </View>
      </View>
      <BudgetTable
        files={files}
        actions={actions}
        onSelect={file => {
          if (file.state === 'remote') {
            downloadBudget(file.cloudFileId);
          } else {
            loadBudget(file.id);
          }
        }}
        onDelete={file => pushModal('delete-budget', { file })}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          padding: 25,
          paddingLeft: 5,
        }}
      >
        <Button
          bare
          style={{
            marginLeft: 10,
            color: colors.n4,
          }}
          onClick={e => {
            e.preventDefault();
            pushModal('import');
          }}
        >
          Import file
        </Button>

        <Button primary onClick={onCreate} style={{ marginLeft: 15 }}>
          Create new file
        </Button>

        {isNonProductionEnvironment() && (
          <Button
            primary
            onClick={() => onCreate({ testMode: true })}
            style={{ marginLeft: 15 }}
          >
            Create test file
          </Button>
        )}
      </View>
    </View>
  );
}

export default connect(
  state => ({
    files: state.budgets.allFiles,
    isLoggedIn: !!state.user.data,
  }),
  actions,
)(BudgetList);
