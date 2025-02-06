import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { deleteBudget } from 'loot-core/client/budgets/budgetsSlice';
import { type File } from 'loot-core/src/types/file';

import { useDispatch } from '../../../redux';
import { theme } from '../../../style';
import { ButtonWithLoading } from '../../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

type DeleteFileProps = {
  file: File;
};

export function DeleteFileModal({ file }: DeleteFileProps) {
  const { t } = useTranslation();

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
            title={t('Delete {{fileName}}', { fileName: file.name })}
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
                  <Trans>
                    This is a <strong>hosted file</strong> which means it is
                    stored on your server to make it available for download on
                    any device. You can delete it from the server, which will
                    also remove it from all of your devices.
                  </Trans>
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
                      deleteBudget({
                        id: 'id' in file ? file.id : undefined,
                        cloudFileId: file.cloudFileId,
                      }),
                    );
                    setLoadingState(null);

                    close();
                  }}
                >
                  <Trans>Delete file from all devices</Trans>
                </ButtonWithLoading>
              </>
            )}

            {'id' in file && (
              <>
                {isCloudFile ? (
                  <Text>
                    <Trans>
                      You can also delete just the local copy. This will remove
                      all local data and the file will be listed as available
                      for download.
                    </Trans>
                  </Text>
                ) : (
                  <Text>
                    {file.state === 'broken' ? (
                      <Trans>
                        This is a <strong>hosted file</strong> but it was
                        created by another user. You can only delete the local
                        copy.
                      </Trans>
                    ) : (
                      <Trans>
                        This a <strong>local file</strong> which is not stored
                        on a server.
                      </Trans>
                    )}{' '}
                    <Trans>
                      Deleting it will remove it and all of its backups
                      permanently.
                    </Trans>
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
                    await dispatch(deleteBudget({ id: file.id }));
                    setLoadingState(null);

                    close();
                  }}
                >
                  <Trans>Delete file locally</Trans>
                </ButtonWithLoading>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
