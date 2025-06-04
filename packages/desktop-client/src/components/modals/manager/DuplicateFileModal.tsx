import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';

import { duplicateBudget } from '@desktop-client/budgets/budgetsSlice';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

type DuplicateFileModalProps = Extract<
  ModalType,
  { name: 'duplicate-budget' }
>['options'];

export function DuplicateFileModal({
  file,
  managePage,
  loadBudget = 'none',
  onComplete,
}: DuplicateFileModalProps) {
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
            oldName: file.name,
            newName,
            cloudSync: sync === 'cloudSync',
            managePage,
            loadBudget,
          }),
        );
        dispatch(
          addNotification({
            notification: {
              type: 'message',
              message: t('Duplicate file “{{newName}}” created.', { newName }),
            },
          }),
        );
        if (onComplete) onComplete({ status: 'success' });
      } catch (e) {
        const newError = new Error(t('Failed to duplicate budget file'));
        if (onComplete) onComplete({ status: 'failed', error: newError });
        else console.error('Failed to duplicate budget file:', e);
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Failed to duplicate budget file.'),
            },
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
                  onChangeValue={setNewName}
                  onUpdate={validateAndSetName}
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
