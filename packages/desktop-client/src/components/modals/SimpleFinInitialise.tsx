// @ts-strict-ignore
import React, { useState } from 'react';

import { getSecretsError } from 'loot-core/shared/errors';
import { send } from 'loot-core/src/platform/client/fetch';

import { Error } from '../alerts';
import { ButtonWithLoading } from '../common/Button2';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '../common/Modal2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type SimpleFinInitialiseProps = {
  onSuccess: () => void;
};

export const SimpleFinInitialise = ({
  onSuccess,
}: SimpleFinInitialiseProps) => {
  const [token, setToken] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('It is required to provide a token.');

  const onSubmit = async (close: () => void) => {
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
    }
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="simplefin-init" containerProps={{ style: { width: 300 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Set-up SimpleFIN"
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              In order to enable bank-sync via SimpleFIN (only for North
              American banks) you will need to create a token. This can be done
              by creating an account with{' '}
              <Link
                variant="external"
                to="https://bridge.simplefin.org/"
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
              variant="primary"
              isLoading={isLoading}
              onPress={() => {
                onSubmit(close);
              }}
            >
              Save and continue
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
};
