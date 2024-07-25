// @ts-strict-ignore
import React, { useState } from 'react';

import { getSecretsError } from 'loot-core/shared/errors';
import { send } from 'loot-core/src/platform/client/fetch';

import { Error } from '../alerts';
import { ButtonWithLoading } from '../common/Button';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import { Modal, ModalButtons } from '../common/Modal';
import type { ModalProps } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type GoCardlessInitialiseProps = {
  modalProps?: Partial<ModalProps>;
  onSuccess: () => void;
};

export const GoCardlessInitialise = ({
  modalProps,
  onSuccess,
}: GoCardlessInitialiseProps) => {
  const [secretId, setSecretId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    'It is required to provide both the secret id and secret key.',
  );

  const onSubmit = async () => {
    if (!secretId || !secretKey) {
      setIsValid(false);
      setError('It is required to provide both the secret id and secret key.');
      return;
    }

    setIsLoading(true);

    let { error, reason } =
      (await send('secret-set', {
        name: 'gocardless_secretId',
        value: secretId,
      })) || {};

    if (error) {
      setIsLoading(false);
      setIsValid(false);
      setError(getSecretsError(error, reason));
      return;
    } else {
      ({ error, reason } =
        (await send('secret-set', {
          name: 'gocardless_secretKey',
          value: secretKey,
        })) || {});
      if (error) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(error, reason));
        return;
      }
    }

    setIsValid(true);
    onSuccess();
    modalProps.onClose();
    setIsLoading(false);
  };

  return (
    <Modal title="Set-up GoCardless" size={{ width: 300 }} {...modalProps}>
      <View style={{ display: 'flex', gap: 10 }}>
        <Text>
          In order to enable bank-sync via GoCardless (only for EU banks) you
          will need to create access credentials. This can be done by creating
          an account with{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/advanced/bank-sync/"
            linkColor="purple"
          >
            GoCardless
          </Link>
          .
        </Text>

        <FormField>
          <FormLabel title="Secret ID:" htmlFor="secret-id-field" />
          <Input
            id="secret-id-field"
            type="password"
            value={secretId}
            onChangeValue={value => {
              setSecretId(value);
              setIsValid(true);
            }}
          />
        </FormField>

        <FormField>
          <FormLabel title="Secret Key:" htmlFor="secret-key-field" />
          <Input
            id="secret-key-field"
            type="password"
            value={secretKey}
            onChangeValue={value => {
              setSecretKey(value);
              setIsValid(true);
            }}
          />
        </FormField>

        {!isValid && <Error>{error}</Error>}
      </View>

      <ModalButtons>
        <ButtonWithLoading
          type="primary"
          loading={isLoading}
          onClick={onSubmit}
        >
          Save and continue
        </ButtonWithLoading>
      </ModalButtons>
    </Modal>
  );
};
