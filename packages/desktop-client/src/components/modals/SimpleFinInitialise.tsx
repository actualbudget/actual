// @ts-strict-ignore
import React, { useState } from 'react';

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

  const onSubmit = async () => {
    if (!token) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    await send('secret-set', {
      name: 'simplefin_token',
      value: token,
    });

    onSuccess();
    setIsLoading(false);
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

            {!isValid && <Error>It is required to provide a token.</Error>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading}
              onPress={() => {
                onSubmit();
                close();
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
