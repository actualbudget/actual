// @ts-strict-ignore
import React, { type FormEvent, useCallback, useState } from 'react';
import { Form } from 'react-aria-components';

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
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type SimpleFinInitialiseProps = {
  onSuccess: () => void;
};

export const SimpleFinInitialiseModal = ({
  onSuccess,
}: SimpleFinInitialiseProps) => {
  const [token, setToken] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>, { close }: { close: () => void }) => {
      e.preventDefault();

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
      close();
    },
    [onSuccess, token],
  );

  return (
    <Modal name="simplefin-init" containerProps={{ style: { width: 300 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Set-up SimpleFIN"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Form onSubmit={e => onSubmit(e, { close })}>
            <View style={{ display: 'flex', gap: 10 }}>
              <Text>
                In order to enable bank-sync via SimpleFIN (only for North
                American banks) you will need to create a token. This can be
                done by creating an account with{' '}
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

              {!isValid && <Error>It is required to provide a token.</Error>}
            </View>

            <ModalButtons>
              <ButtonWithLoading
                variant="primary"
                type="submit"
                autoFocus
                isLoading={isLoading}
              >
                Save and continue
              </ButtonWithLoading>
            </ModalButtons>
          </Form>
        </>
      )}
    </Modal>
  );
};
