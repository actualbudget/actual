import React, { useState } from 'react';

import { colors } from '../../style';
import { View, Text, Modal, ButtonWithLoading } from '../common';

export default function DeleteMenu({ modalProps, actions, file }) {
  let [loadingState, setLoadingState] = useState(null);

  async function onDeleteCloud() {
    setLoadingState('cloud');
    await actions.deleteBudget(file.id, file.cloudFileId);
    setLoadingState(null);

    modalProps.onBack();
  }

  async function onDeleteLocal() {
    setLoadingState('local');
    await actions.deleteBudget(file.id);
    setLoadingState(null);

    modalProps.onBack();
  }

  // If the state is "broken" that means it was created by another
  // user. The current user should be able to delete the local file,
  // but not the remote one
  let isRemote = file.cloudFileId && file.state !== 'broken';

  return (
    <Modal
      {...modalProps}
      title={'Delete ' + file.name}
      padding={0}
      showOverlay={false}
      onClose={modalProps.onBack}
    >
      {() => (
        <View
          style={{
            padding: 15,
            paddingTop: 0,
            paddingBottom: 25,
            width: 500,
            lineHeight: '1.5em'
          }}
        >
          {isRemote && (
            <>
              <Text>
                This is a <strong>hosted file</strong> which we store to make it
                available for download on any device. You can delete it from our
                servers which will remove it from all of your devices.
              </Text>

              <ButtonWithLoading
                primary
                loading={loadingState === 'cloud'}
                style={{
                  backgroundColor: colors.r4,
                  alignSelf: 'center',
                  border: 0,
                  marginTop: 10,
                  padding: '10px 30px',
                  fontSize: 14
                }}
                onClick={onDeleteCloud}
              >
                Delete file from all devices
              </ButtonWithLoading>
            </>
          )}

          {file.id && (
            <>
              <Text style={[isRemote && { marginTop: 20 }]}>
                {isRemote ? (
                  <Text>
                    You can also delete just the local copy. This will remove
                    all local data and the file will be listed as available for
                    download.
                  </Text>
                ) : (
                  <Text>
                    {file.state === 'broken' ? (
                      <Text>
                        This is a <strong>hosted file</strong> but it was
                        created by another user. You can only delete the local
                        copy.
                      </Text>
                    ) : (
                      <Text>
                        This a <strong>local file</strong> which is not stored
                        on our servers.
                      </Text>
                    )}{' '}
                    Deleting it will remove it and all of its backup
                    permanently.
                  </Text>
                )}
              </Text>

              <ButtonWithLoading
                primary={!isRemote}
                loading={loadingState === 'local'}
                style={[
                  {
                    alignSelf: 'center',
                    marginTop: 10,
                    padding: '10px 30px',
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
                onClick={onDeleteLocal}
              >
                Delete file locally
              </ButtonWithLoading>
            </>
          )}
        </View>
      )}
    </Modal>
  );
}
