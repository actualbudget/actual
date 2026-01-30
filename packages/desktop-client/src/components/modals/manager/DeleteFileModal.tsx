import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { deleteBudget } from '@desktop-client/budgetfiles/budgetfilesSlice';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useSyncServerStatus } from '@desktop-client/hooks/useSyncServerStatus';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

type DeleteFileModalProps = Extract<
  ModalType,
  { name: 'delete-budget' }
>['options'];

export function DeleteFileModal({ file }: DeleteFileModalProps) {
  const { t } = useTranslation();

  // If the state is "broken" that means it was created by another
  // user. The current user should be able to delete the local file,
  // but not the remote one
  const isCloudFile = 'cloudFileId' in file && file.state !== 'broken';
  const serverStatus = useSyncServerStatus();
  const dispatch = useDispatch();

  // Get current user info to check ownership
  const userData = useSelector(state => state.user.data);
  const currentUserId = userData?.userId;

  // Check if current user is the owner or has admin permissions
  const isOwner = 'owner' in file && file.owner === currentUserId;
  const isAdmin = userData?.permission === 'ADMIN';
  const canDeleteFromServer = isOwner || isAdmin;

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
            {isCloudFile &&
              (canDeleteFromServer ? (
                <>
                  <Text>
                    <Trans>
                      This is a <strong>hosted file</strong> which means it is
                      stored on your server to make it available for download on
                      any device. You can delete it from the server, which will
                      also remove it from all of your devices.
                    </Trans>
                  </Text>

                  {serverStatus === 'online' ? (
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
                  ) : (
                    <Button
                      isDisabled
                      style={{
                        alignSelf: 'center',
                        padding: '10px 30px',
                        fontSize: 14,
                      }}
                    >
                      <Trans>Server is not available</Trans>
                    </Button>
                  )}
                </>
              ) : (
                <Text>
                  <Trans>
                    This is a <strong>hosted file</strong> shared with you. Only
                    the file owner can delete it from the server.
                  </Trans>
                </Text>
              ))}

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
