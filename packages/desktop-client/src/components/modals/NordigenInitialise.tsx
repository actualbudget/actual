import React, { useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { Error } from '../alerts';
import { ExternalLink } from '../common';
import { ButtonWithLoading } from '../common/Button';
import Input from '../common/Input';
import Modal, { ModalButtons } from '../common/Modal';
import type { ModalProps } from '../common/Modal';
import Text from '../common/Text';
import View from '../common/View';
import { FormField, FormLabel } from '../forms';

type NordigenInitialiseProps = {
  modalProps?: Partial<ModalProps>;
  onSuccess: () => void;
};

const NordigenInitialise = ({
  modalProps,
  onSuccess,
}: NordigenInitialiseProps) => {
  const [secretId, setSecretId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (!secretId || !secretKey) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    await Promise.all([
      send('secret-set', {
        name: 'nordigen_secretId',
        value: secretId,
      }),
      send('secret-set', {
        name: 'nordigen_secretKey',
        value: secretKey,
      }),
    ]);

    onSuccess();
    modalProps.onClose();
    setIsLoading(false);
  };

  return (
    <Modal title="Set-up Nordigen" size={{ width: 300 }} {...modalProps}>
      <View style={{ display: 'flex', gap: 10 }}>
        <Text>
          In order to enable bank-sync via Nordigen (only for EU banks) you will
          need to create access credentials. This can be done by creating an
          account with{' '}
          <ExternalLink to="https://nordigen.com/">Nordigen</ExternalLink>.
        </Text>

        <FormField>
          <FormLabel title="Secret ID:" htmlFor="secret-id-field" />
          <Input
            id="secret-id-field"
            type="password"
            value={secretId}
            onUpdate={setSecretId}
            onChange={() => setIsValid(true)}
          />
        </FormField>

        <FormField>
          <FormLabel title="Secret Key:" htmlFor="secret-key-field" />
          <Input
            id="secret-key-field"
            type="password"
            value={secretKey}
            onUpdate={setSecretKey}
            onChange={() => setIsValid(true)}
          />
        </FormField>

        {!isValid && (
          <Error>
            It is required to provide both the secret id and secret key.
          </Error>
        )}
      </View>

      <ModalButtons>
        <ButtonWithLoading loading={isLoading} primary onClick={onSubmit}>
          Save and continue
        </ButtonWithLoading>
      </ModalButtons>
    </Modal>
  );
};

export default NordigenInitialise;
