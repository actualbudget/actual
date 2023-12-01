import React, { useState } from 'react';

import { type File, isLocalFile } from 'loot-core/src/types/file';

import { type BoundActions } from '../../hooks/useActions';
import { theme } from '../../style';
import { type CommonModalProps } from '../../types/modals';
import { ButtonWithLoading } from '../common/Button';
import Modal from '../common/Modal';
import Text from '../common/Text';
import View from '../common/View';

type DeleteMenuProps = {
  modalProps: CommonModalProps;
  actions: BoundActions;
  file: File;
};

export default function DeleteMenu({
  modalProps,
  actions,
  file,
}: DeleteMenuProps) {
  let [loadingState, setLoadingState] = useState<'cloud' | 'local' | null>(
    null,
  );

  async function onDeleteCloud() {
    if (isLocalFile(file)) return;
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
  let isRemote =
    !isLocalFile(file) && file.cloudFileId && file.state !== 'broken';

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
            gap: 15,
            paddingTop: 0,
            paddingBottom: 25,
            maxWidth: 512,
            lineHeight: '1.5em',
          }}
        >
          {isRemote && (
            <>
              <Text>
                This is a <strong>hosted file</strong> which means it is stored
                on your server to make it available for download on any device.
                You can delete it from the server, which will also remove it
                from all of your devices.
              </Text>

              <ButtonWithLoading
                type="primary"
                loading={loadingState === 'cloud'}
                style={{
                  backgroundColor: theme.errorText,
                  alignSelf: 'center',
                  border: 0,
                  padding: '10px 30px',
                  fontSize: 14,
                }}
                onClick={onDeleteCloud}
              >
                Delete file from all devices
              </ButtonWithLoading>
            </>
          )}

          {file.id && (
            <>
              {isRemote ? (
                <Text>
                  You can also delete just the local copy. This will remove all
                  local data and the file will be listed as available for
                  download.
                </Text>
              ) : (
                <Text>
                  {file.state === 'broken' ? (
                    <>
                      This is a <strong>hosted file</strong> but it was created
                      by another user. You can only delete the local copy.
                    </>
                  ) : (
                    <>
                      This a <strong>local file</strong> which is not stored on
                      a server.
                    </>
                  )}{' '}
                  Deleting it will remove it and all of its backups permanently.
                </Text>
              )}

              <ButtonWithLoading
                type={isRemote ? 'normal' : 'primary'}
                loading={loadingState === 'local'}
                style={{
                  alignSelf: 'center',
                  marginTop: 10,
                  padding: '10px 30px',
                  fontSize: 14,
                  ...(isRemote
                    ? {
                        color: theme.errorText,
                        borderColor: theme.errorText,
                      }
                    : {
                        border: 0,
                        backgroundColor: theme.errorText,
                      }),
                }}
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
