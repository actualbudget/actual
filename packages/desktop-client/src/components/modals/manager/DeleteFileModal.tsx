import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { deleteBudget } from 'loot-core/client/actions';
import { type File } from 'loot-core/src/types/file';

import { theme } from '../../../style';
import { ButtonWithLoading } from '../../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

type DeleteFileProps = {
  file: File;
};

export function DeleteFileModal({ file }: DeleteFileProps) {
  // If the state is "broken" that means it was created by another
  // user. The current user should be able to delete the local file,
  // but not the remote one
  const isCloudFile = 'cloudFileId' in file && file.state !== 'broken';
  const dispatch = useDispatch();

  const [loadingState, setLoadingState] = useState<'cloud' | 'local' | null>(
    null,
  );

  return (
    <Modal name="delete-budget">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={'Delete ' + file.name}
            rightContent={<ModalCloseButton onPress={close} />}
          />
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
            {isCloudFile && (
              <>
                <Text>
                  This is a <strong>hosted file</strong> which means it is
                  stored on your server to make it available for download on any
                  device. You can delete it from the server, which will also
                  remove it from all of your devices.
                </Text>

                <ButtonWithLoading
                  variant="primary"
                  isLoading={loadingState === 'cloud'}
                  style={{
                    backgroundColor: theme.errorText,
                    alignSelf: 'center',
                    border: 0,
                    padding: '10px 30px',
                    fontSize: 14,
                  }}
                  onPress={async () => {
                    setLoadingState('cloud');
                    await dispatch(
                      deleteBudget(
                        'id' in file ? file.id : undefined,
                        file.cloudFileId,
                      ),
                    );
                    setLoadingState(null);

                    close();
                  }}
                >
                  Delete file from all devices
                </ButtonWithLoading>
              </>
            )}

            {'id' in file && (
              <>
                {isCloudFile ? (
                  <Text>
                    You can also delete just the local copy. This will remove
                    all local data and the file will be listed as available for
                    download.
                  </Text>
                ) : (
                  <Text>
                    {file.state === 'broken' ? (
                      <>
                        This is a <strong>hosted file</strong> but it was
                        created by another user. You can only delete the local
                        copy.
                      </>
                    ) : (
                      <>
                        This a <strong>local file</strong> which is not stored
                        on a server.
                      </>
                    )}{' '}
                    Deleting it will remove it and all of its backups
                    permanently.
                  </Text>
                )}

                <ButtonWithLoading
                  variant={isCloudFile ? 'normal' : 'primary'}
                  isLoading={loadingState === 'local'}
                  style={{
                    alignSelf: 'center',
                    marginTop: 10,
                    padding: '10px 30px',
                    fontSize: 14,
                    ...(isCloudFile
                      ? {
                          color: theme.errorText,
                          borderColor: theme.errorText,
                        }
                      : {
                          border: 0,
                          backgroundColor: theme.errorText,
                        }),
                  }}
                  onPress={async () => {
                    setLoadingState('local');
                    await dispatch(deleteBudget(file.id));
                    setLoadingState(null);

                    close();
                  }}
                >
                  Delete file locally
                </ButtonWithLoading>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
