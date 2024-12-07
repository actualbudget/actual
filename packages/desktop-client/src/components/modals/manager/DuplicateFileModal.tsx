import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
  addNotification,
  duplicateBudget,
  uniqueBudgetName,
  validateBudgetName,
} from 'loot-core/client/actions';
import { type File } from 'loot-core/src/types/file';

import { theme } from '../../../style';
import { Button, ButtonWithLoading } from '../../common/Button2';
import { FormError } from '../../common/FormError';
import { InitialFocus } from '../../common/InitialFocus';
import { InlineField } from '../../common/InlineField';
import { Input } from '../../common/Input';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '../../common/Modal';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

type DuplicateFileProps = {
  file: File;
  managePage?: boolean;
  loadBudget?: 'none' | 'original' | 'copy';
  onComplete?: (event: {
    status: 'success' | 'failed' | 'canceled';
    error?: object;
  }) => void;
};

export function DuplicateFileModal({
  file,
  managePage,
  loadBudget = 'none',
  onComplete,
}: DuplicateFileProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState(file.name + t(' - copy'));
  const [nameError, setNameError] = useState<string | null>(null);

  // If the state is "broken" that means it was created by another user.
  const isCloudFile = 'cloudFileId' in file && file.state !== 'broken';
  const dispatch = useDispatch();

  const [loadingState, setLoadingState] = useState<'cloud' | 'local' | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      setNewName(await uniqueBudgetName(file.name + t(' - copy')));
    })();
  }, [file.name]);

  const validateAndSetName = async (name: string) => {
    const trimmedName = name.trim();
    const { valid, message } = await validateBudgetName(trimmedName);
    if (valid) {
      setNewName(trimmedName);
      setNameError(null);
    } else {
      // The "Unknown error" should never happen, but this satifies type checking
      setNameError(message ?? t('Unknown error with budget name'));
    }
  };

  const handleDuplicate = async (sync: 'localOnly' | 'cloudSync') => {
    const { valid, message } = await validateBudgetName(newName);
    if (valid) {
      setLoadingState(sync === 'cloudSync' ? 'cloud' : 'local');

      try {
        await dispatch(
          duplicateBudget({
            id: 'id' in file ? file.id : undefined,
            cloudId:
              sync === 'cloudSync' && 'cloudFileId' in file
                ? file.cloudFileId
                : undefined,
            oldName: file.name,
            newName,
            cloudSync: sync === 'cloudSync',
            managePage,
            loadBudget,
          }),
        );
        dispatch(
          addNotification({
            type: 'message',
            message: t('Duplicate file “{{newName}}” created.', { newName }),
          }),
        );
        if (onComplete) onComplete({ status: 'success' });
      } catch (e) {
        const newError = new Error(t('Failed to duplicate budget'));
        if (onComplete) onComplete({ status: 'failed', error: newError });
        else console.error('Failed to duplicate budget:', e);
        dispatch(
          addNotification({
            type: 'error',
            message: t('Failed to duplicate budget file.'),
          }),
        );
      } finally {
        setLoadingState(null);
      }
    } else {
      const failError = new Error(
        message ?? t('Unknown error with budget name'),
      );
      if (onComplete) onComplete({ status: 'failed', error: failError });
    }
  };

  return (
    <Modal name="duplicate-budget">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Duplicate “{{fileName}}”', { fileName: file.name })}
            rightContent={
              <ModalCloseButton
                onPress={() => {
                  close();
                  if (onComplete) onComplete({ status: 'canceled' });
                }}
              />
            }
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
            <InlineField
              label={t('New Budget Name')}
              width="100%"
              labelWidth={150}
            >
              <InitialFocus>
                <Input
                  name="name"
                  value={newName}
                  aria-label={t('New Budget Name')}
                  aria-invalid={nameError ? 'true' : 'false'}
                  onChange={event => setNewName(event.target.value)}
                  onBlur={event => validateAndSetName(event.target.value)}
                  style={{ flex: 1 }}
                />
              </InitialFocus>
            </InlineField>
            {nameError && (
              <FormError style={{ marginLeft: 150, color: theme.warningText }}>
                {nameError}
              </FormError>
            )}

            {isCloudFile && (
              <>
                <Text>
                  <Trans>
                    Current budget is a <strong>hosted budget</strong> which
                    means it is stored on your server to make it available for
                    download on any device. Would you like to duplicate this
                    budget for all devices?
                  </Trans>
                </Text>

                <ButtonWithLoading
                  variant={loadingState !== null ? 'bare' : 'primary'}
                  isLoading={loadingState === 'cloud'}
                  style={{
                    alignSelf: 'center',
                    marginLeft: 30,
                    padding: '5px 30px',
                    fontSize: 14,
                  }}
                  onPress={() => handleDuplicate('cloudSync')}
                >
                  <Trans>Duplicate budget for all devices</Trans>
                </ButtonWithLoading>
              </>
            )}

            {'id' in file && (
              <>
                {isCloudFile ? (
                  <Text>
                    <Trans>
                      You can also duplicate to just the local copy. This will
                      leave the original on the server and create a duplicate on
                      only this device.
                    </Trans>
                  </Text>
                ) : (
                  <Text>
                    <Trans>
                      This is a <strong>local budget</strong> which is not
                      stored on a server. Only a local copy will be duplicated.
                    </Trans>
                  </Text>
                )}

                <ModalButtons>
                  <Button
                    onPress={() => {
                      close();
                      if (onComplete) onComplete({ status: 'canceled' });
                    }}
                  >
                    <Trans>Cancel</Trans>
                  </Button>
                  <ButtonWithLoading
                    variant={
                      loadingState !== null
                        ? 'bare'
                        : isCloudFile
                          ? 'normal'
                          : 'primary'
                    }
                    isLoading={loadingState === 'local'}
                    style={{
                      alignSelf: 'center',
                      marginLeft: 30,
                      padding: '5px 30px',
                      fontSize: 14,
                    }}
                    onPress={() => handleDuplicate('localOnly')}
                  >
                    {!isCloudFile && <Trans>Duplicate budget</Trans>}
                    {isCloudFile && (
                      <Trans>Duplicate budget locally only</Trans>
                    )}
                  </ButtonWithLoading>
                </ModalButtons>
              </>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
