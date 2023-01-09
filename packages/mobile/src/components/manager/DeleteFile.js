import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import Modal from '../modals/Modal';
import {
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/mobile/common';
import { colors, styles } from 'loot-design/src/style';

function DeleteFile({ route, navigation, deleteBudget }) {
  let { file } = route.params;
  let { state } = file;
  let [loadingState, setLoadingState] = useState(null);

  async function onDeleteCloud() {
    setLoadingState('cloud');
    await deleteBudget(file.id, file.cloudFileId);
    setLoadingState(null);

    navigation.goBack();
  }

  async function onDeleteLocal() {
    setLoadingState('local');
    await deleteBudget(file.id);
    setLoadingState(null);

    navigation.goBack();
  }

  // If the state is "broken" that means it was created by another
  // user. The current user should be able to delete the local file,
  // but not the remote one
  let isRemote = file.cloudFileId && file.state !== 'broken';

  return (
    <Modal
      title={`Delete ${file.name}`}
      showOverlay={false}
      forceInset={{ bottom: 'never' }}
    >
      <View style={{ padding: 15 }}>
        {isRemote && (
          <>
            <Text style={styles.text}>
              This is a hosted file which we store to make it available for
              download on any device. You can delete it from our servers which
              will remove it from all of your devices.
            </Text>

            <ButtonWithLoading
              primary
              loading={loadingState === 'cloud'}
              style={{
                backgroundColor: colors.r4,
                alignSelf: 'center',
                border: 0,
                marginTop: 10
              }}
              contentStyle={{ borderWidth: 0 }}
              onPress={onDeleteCloud}
            >
              Delete file from all devices
            </ButtonWithLoading>
          </>
        )}

        {file.id && (
          <>
            <Text style={[styles.text, isRemote && { marginTop: 20 }]}>
              {isRemote ? (
                <Text>
                  You can also delete just the local copy. This will remove all
                  local data and the file will be listed as available for
                  download.
                </Text>
              ) : (
                <Text>
                  {file.state === 'broken' ? (
                    <Text>
                      This is a hosted file but it was created by another user.
                      You can only delete the local copy.
                    </Text>
                  ) : (
                    <Text>
                      This a local file which is not stored on our servers.{' '}
                    </Text>
                  )}
                  <Text>
                    Deleting it will remove it and all of its backup
                    permanently.
                  </Text>
                </Text>
              )}
            </Text>

            <ButtonWithLoading
              primary={!isRemote}
              loading={loadingState === 'local'}
              loadingColor={isRemote ? colors.n1 : 'white'}
              style={[
                {
                  alignSelf: 'center',
                  marginTop: 10,
                  fontSize: 14
                },
                isRemote
                  ? {
                      color: colors.r4,
                      borderColor: colors.r4
                    }
                  : {
                      border: 0,
                      backgroundColor: colors.r4
                    }
              ]}
              contentStyle={!isRemote && { borderWidth: 0 }}
              onPress={onDeleteLocal}
            >
              Delete file locally
            </ButtonWithLoading>
          </>
        )}
      </View>
    </Modal>
  );
}

export default connect(null, actions)(DeleteFile);
