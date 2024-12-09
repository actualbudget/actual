// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/src/platform/client/fetch';

import { Error } from '../alerts';
import { ButtonWithLoading } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
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

type GoCardlessInitialiseProps = {
  onSuccess: () => void;
};

export const GoCardlessInitialiseModal = ({
  onSuccess,
}: GoCardlessInitialiseProps) => {
  const { t } = useTranslation();
  const [secretId, setSecretId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (close: () => void) => {
    if (!secretId || !secretKey) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    await Promise.all([
      send('secret-set', {
        name: 'gocardless_secretId',
        value: secretId,
      }),
      send('secret-set', {
        name: 'gocardless_secretKey',
        value: secretKey,
      }),
    ]);

    onSuccess();
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="gocardless-init" containerProps={{ style: { width: '30vw' } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set-up GoCardless')} // Translated title
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              {t(
                'In order to enable bank-sync via GoCardless (only for EU banks) you will need to create access credentials. This can be done by creating an account with',
              )}{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/advanced/bank-sync/"
                linkColor="purple"
              >
                {t('GoCardless')}
              </Link>
              .
            </Text>

            <FormField>
              <FormLabel title={t('Secret ID:')} htmlFor="secret-id-field" />
              <InitialFocus>
                <Input
                  id="secret-id-field"
                  type="password"
                  value={secretId}
                  onChangeValue={value => {
                    setSecretId(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel title={t('Secret Key:')} htmlFor="secret-key-field" />
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

            {!isValid && (
              <Error>
                {t(
                  'It is required to provide both the secret id and secret key.',
                )}
              </Error>
            )}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading}
              onPress={() => {
                onSubmit(close);
              }}
            >
              {t('Save and continue')}
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
};
