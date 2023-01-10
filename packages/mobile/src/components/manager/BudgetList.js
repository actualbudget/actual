import React, { useState } from 'react';
import { View, Text, FlatList, StatusBar } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { connectActionSheet } from '@expo/react-native-action-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from 'loot-design/src/style';
import * as actions from 'loot-core/src/client/actions';
import { RectButton } from 'react-native-gesture-handler';
import { Button } from 'loot-design/src/components/mobile/common';
import { ListItem, ROW_HEIGHT } from 'loot-design/src/components/mobile/table';
import Loading from 'loot-design/src/svg/v1/AnimatedLoading';
import CloudCheck from 'loot-design/src/svg/v1/CloudCheck';
import CloudDownload from 'loot-design/src/svg/v1/CloudDownload';
import CloudUnknown from 'loot-design/src/svg/v2/CloudUnknown';
import FileDouble from 'loot-design/src/svg/v1/FileDouble';
import RefreshArrow from 'loot-design/src/svg/v2/RefreshArrow';
import DotsHorizontalTriple from 'loot-design/src/svg/v1/DotsHorizontalTriple';
import Modal from '../modals/Modal';
import UserButton from './UserButton';
import * as iap from '../../util/iap.js';

function getFileDescription(file) {
  if (file.state === 'unknown') {
    return (
      "This is a cloud-based file but it's state is unknown because you " +
      'are offline.'
    );
  }

  if (file.encryptKeyId) {
    if (file.hasKey) {
      return 'This file is encrypted and you have the key to access it.';
    }
    return 'This file is encrypted and you do not have the key for it.';
  }

  return null;
}

function getActionsForFile(file, onDelete) {
  let title = getFileDescription(file);
  let options = [{ title: 'Delete', handler: onDelete }];

  return {
    title,
    options: options.map(opt => opt.title),
    handler: idx => idx < options.length && options[idx].handler()
  };
}

function FileIcon({ state, style }) {
  let Icon;
  let color = colors.n1;

  switch (state) {
    case 'unknown':
      Icon = CloudUnknown;
      color = colors.n7;
      break;
    case 'remote':
      Icon = CloudDownload;
      break;
    case 'local':
      Icon = FileDouble;
      break;
    case 'broken':
      Icon = CloudUnknown;
      color = colors.n7;
      break;
    default:
      Icon = CloudCheck;
      break;
  }

  return (
    <Icon
      color={color}
      style={{
        width: 20,
        height: 20,
        color,
        ...style
      }}
    />
  );
}

function showBrokenMessage(file, showActionSheetWithOptions, onDelete) {
  let { options, title, handler } = getActionsForFile(file, onDelete);
  options.push('Cancel');

  showActionSheetWithOptions(
    {
      options,
      cancelButtonIndex: options.length - 1,
      title
    },
    handler
  );
}

function DetailsButton({ file, style, showActionSheetWithOptions, onDelete }) {
  let [loading, setLoading] = useState(false);

  function openMenu() {
    if (file.state === 'unknown') {
      alert(getFileDescription(file));
      return;
    }

    let { options, title, handler } = getActionsForFile(file, onDelete);
    options.push('Cancel');

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title
      },
      handler
    );
  }

  return (
    <Button
      bare
      style={{ padding: 7, backgroundColor: 'transparent' }}
      hitSlop={{
        left: 10,
        right: 10,
        top: 10,
        bottom: 10
      }}
      onPress={openMenu}
    >
      <DotsHorizontalTriple style={{ width: 20, height: 20 }} />
    </Button>
  );
}

function EmptyMessage() {
  return (
    <Text
      style={{
        fontSize: 17,
        margin: 20,
        color: colors.n5,
        textAlign: 'center'
      }}
    >
      No existing files. Create one below!
    </Text>
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
    <Button bare style={{ padding: 10, marginRight: 5 }} onPress={_onRefresh}>
      <Icon
        color={colors.n1}
        style={{ width: 18, height: 18, color: colors.n1 }}
      />
    </Button>
  );
}

function File({ file, showActionSheetWithOptions, onSelect, onDelete }) {
  return (
    <ListItem
      style={{
        paddingHorizontal: 0,
        alignItems: 'stretch',
        flexDirection: 'column'
      }}
    >
      <RectButton onPress={onSelect}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            height: ROW_HEIGHT
          }}
        >
          <FileIcon state={file.state} />
          <Text
            style={[
              styles.text,
              { flex: 1, marginLeft: 7 },
              file.state === 'broken' && { color: colors.n7 }
            ]}
          >
            {file.name}
          </Text>
          <DetailsButton
            file={file}
            showActionSheetWithOptions={showActionSheetWithOptions}
            onDelete={() => onDelete(file)}
          />
        </View>
      </RectButton>
    </ListItem>
  );
}

class BudgetList extends React.Component {
  componentDidMount() {
    // Status bar won't change unless we do it imperatively?? When you
    // close the file it's stuck in dark mode
    StatusBar.setBarStyle('light-content');
  }

  onDelete = file => {
    this.props.navigation.navigate('DeleteFile', { file });
  };

  onCreate = () => {
    if (!this.creating) {
      this.creating = true;
      this.props.createBudget();
    }
  };

  render() {
    let {
      navigation,
      files,
      loadAllFiles,
      getUserData,
      showActionSheetWithOptions,
      keyId
    } = this.props;

    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <Modal
          title="Select a file"
          backgroundColor="white"
          allowScrolling={false}
          showOverlay={false}
          edges={['top']}
          rightButton={
            <RefreshButton
              onRefresh={() => {
                getUserData();
                loadAllFiles();
              }}
            />
          }
        >
          {/* <StatusBar barStyle="light-content" /> */}
          <FlatList
            data={files}
            ListEmptyComponent={EmptyMessage}
            renderItem={({ item: file }) => (
              <File
                file={file}
                showActionSheetWithOptions={showActionSheetWithOptions}
                onSelect={() => {
                  if (file.state === 'broken') {
                    showBrokenMessage(file, showActionSheetWithOptions, () =>
                      this.onDelete(file)
                    );
                  } else if (file.state === 'remote') {
                    this.props.downloadBudget(file.cloudFileId);
                  } else {
                    this.props.loadBudget(file.id);
                  }
                }}
                onDelete={this.onDelete}
              />
            )}
            keyExtractor={item => item.id}
            style={{ flex: 1 }}
          />
          <View
            style={{
              alignItems: 'center',
              marginHorizontal: 10,
              marginVertical: 15,
              flexDirection: 'row'
            }}
          >
            <Button primary style={{ flex: 1 }} onPress={() => this.onCreate()}>
              New file
            </Button>
          </View>
        </Modal>
        <UserButton
          navigation={navigation}
          keyId={keyId}
          onLogOut={() => {
            iap.resetUser();
            this.props.signOut();
          }}
        />
      </SafeAreaView>
    );
  }
}

export default connect(
  state => ({
    files: state.budgets.allFiles,
    globalPrefs: state.prefs.global,
    keyId: state.prefs.global.keyId
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(connectActionSheet(BudgetList));
