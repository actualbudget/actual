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

type SimpleFinInitialiseProps = {
  modalProps?: Partial<ModalProps>;
  onSuccess: () => void;
};

export const SimpleFinInitialise = ({
  modalProps,
  onSuccess,
}: SimpleFinInitialiseProps) => {
  const [token, setToken] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('It is required to provide a token.');

  const onSubmit = async () => {
    if (!token) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    const { error, reason } =
      (await send('secret-set', {
        name: 'simplefin_token',
        value: token,
      })) || {};

    if (error) {
      setIsValid(false);
      setError(getSecretsError(error, reason));
    } else {
      onSuccess();
      modalProps.onClose();
    }
    setIsLoading(false);
  };

  return (
    <Modal title="Set-up SimpleFIN" size={{ width: 300 }} {...modalProps}>
      <View style={{ display: 'flex', gap: 10 }}>
        <Text>
          In order to enable bank-sync via SimpleFIN (only for North American
          banks) you will need to create a token. This can be done by creating
          an account with{' '}
          <Link
            variant="external"
            to="https://beta-bridge.simplefin.org/"
            linkColor="purple"
          >
            SimpleFIN
          </Link>
          .
        </Text>

        <FormField>
          <FormLabel title="Token:" htmlFor="token-field" />
          <Input
            id="token-field"
            type="password"
            value={token}
            onChangeValue={value => {
              setToken(value);
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
