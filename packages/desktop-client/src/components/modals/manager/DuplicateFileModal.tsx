import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { duplicateBudget } from 'loot-core/client/actions';
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
};

export function DuplicateFileModal({ file, managePage }: DuplicateFileProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState(file.name + ' - copy');
  const [nameError, setNameError] = useState<string | null>(null);

  // If the state is "broken" that means it was created by another user.
  const isCloudFile = 'cloudFileId' in file && file.state !== 'broken';
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<'cloud' | 'local' | null>(
    null,
  );

  const validateNewName = (name: string): string | null => {
    if (name === '') return 'Name can not be blank';
    return null;
  };

  const validateAndSetName = (name: string) => {
    const nameError = validateNewName(name);
    if (nameError) {
      setNameError(nameError);
    } else {
      setNewName(name);
      setNameError(null);
    }
  };

  return (
    <Modal name="duplicate-budget">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Duplicate “{{fileName}}”', { fileName: file.name })}
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
            <InlineField label="New Budget Name" width="100%" labelWidth={150}>
              <InitialFocus>
                <Input
                  name="name"
                  value={newName}
                  onChange={event => setNewName(event.target.value)}
                  onBlur={event => {
                    const name = event.target.value.trim();
                    validateAndSetName(name);
                  }}
                  style={{ flex: 1 }}
                />
              </InitialFocus>
            </InlineField>
            {nameError && (
              <FormError style={{ marginLeft: 75, color: theme.warningText }}>
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
                  variant={loading ? 'bare' : 'primary'}
                  isLoading={loadingState === 'cloud'}
                  style={{
                    alignSelf: 'center',
                    marginLeft: 30,
                    padding: '5px 30px',
                    fontSize: 14,
                  }}
                  onPress={async () => {
                    const nameError = validateNewName(newName);
                    if (!nameError) {
                      setLoading(true);
                      setLoadingState('cloud');
                      await dispatch(
                        duplicateBudget({
                          id: 'id' in file ? file.id : undefined,
                          cloudId: file.cloudFileId,
                          oldName: file.name,
                          newName,
                          cloudSync: true,
                          managePage,
                        }),
                      );
                      setLoadingState(null);
                      setLoading(false);
                    }
                  }}
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
                      This a <strong>local budget</strong> which is not stored
                      on a server. Only a local copy will be duplicated.
                    </Trans>
                  </Text>
                )}

                <ModalButtons>
                  <Button onPress={close}>Cancel</Button>
                  <ButtonWithLoading
                    variant={
                      loading ? 'bare' : isCloudFile ? 'normal' : 'primary'
                    }
                    isLoading={loadingState === 'local'}
                    style={{
                      alignSelf: 'center',
                      marginLeft: 30,
                      padding: '5px 30px',
                      fontSize: 14,
                    }}
                    onPress={async () => {
                      const nameError = validateNewName(newName);
                      if (!nameError) {
                        setLoading(true);
                        setLoadingState('local');
                        await dispatch(
                          duplicateBudget({
                            id: file.id,
                            oldName: file.name,
                            newName,
                            managePage,
                          }),
                        );
                        setLoadingState(null);
                        setLoading(false);
                      }
                    }}
                  >
                    <Trans>Duplicate budget</Trans>
                    {isCloudFile && <Trans> locally only</Trans>}
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
