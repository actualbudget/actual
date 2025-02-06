import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { addNotification } from 'loot-core/client/actions';
import { duplicateBudget } from 'loot-core/client/budgets/budgetsSlice';
import { send } from 'loot-core/platform/client/fetch';
import { type File } from 'loot-core/src/types/file';

import { useDispatch } from '../../../redux';
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
  const fileEndingTranslation = ' - ' + t('copy');
  const [newName, setNewName] = useState(file.name + fileEndingTranslation);
  const [nameError, setNameError] = useState<string | null>(null);

  // If the state is "broken" that means it was created by another user.
  const isCloudFile = 'cloudFileId' in file && file.state !== 'broken';
  const isLocalFile = 'id' in file;
  const dispatch = useDispatch();

  const [loadingState, setLoadingState] = useState<'cloud' | 'local' | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      setNewName(await uniqueBudgetName(file.name + fileEndingTranslation));
    })();
  }, [file.name, fileEndingTranslation]);

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
        const newError = new Error(t('Failed to duplicate budget file'));
        if (onComplete) onComplete({ status: 'failed', error: newError });
        else console.error('Failed to duplicate budget file:', e);
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
        <View style={{ maxWidth: 700 }}>
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

            {isLocalFile ? (
              isCloudFile && (
                <Text>
                  <Trans>
                    Your budget is hosted on a server, making it accessible for
                    download on your devices.
                    <br />
                    Would you like to duplicate this budget for all your devices
                    or keep it stored locally on this device?
                  </Trans>
                </Text>
              )
            ) : (
              <Text>
                <Trans>
                  Unable to duplicate a budget that is not located on your
                  device.
                  <br />
                  Please download the budget from the server before duplicating.
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
              {isLocalFile && isCloudFile && (
                <ButtonWithLoading
                  variant={loadingState !== null ? 'bare' : 'primary'}
                  isLoading={loadingState === 'cloud'}
                  style={{
                    marginLeft: 10,
                  }}
                  onPress={() => handleDuplicate('cloudSync')}
                >
                  <Trans>Duplicate for all devices</Trans>
                </ButtonWithLoading>
              )}
              {isLocalFile && (
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
                    marginLeft: 10,
                  }}
                  onPress={() => handleDuplicate('localOnly')}
                >
                  {isCloudFile ? (
                    <Trans>Duplicate locally</Trans>
                  ) : (
                    <Trans>Duplicate</Trans>
                  )}
                </ButtonWithLoading>
              )}
            </ModalButtons>
          </View>
        </View>
      )}
    </Modal>
  );
}

async function validateBudgetName(name: string): Promise<{
  valid: boolean;
  message?: string;
}> {
  return send('validate-budget-name', { name });
}

async function uniqueBudgetName(name: string): Promise<string> {
  return send('unique-budget-name', { name });
}
