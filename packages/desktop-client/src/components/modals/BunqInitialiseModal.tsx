// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { getSecretsError } from 'loot-core/shared/errors';

import { Error } from '@desktop-client/components/alerts';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type BunqInitialiseModalProps = Extract<
  ModalType,
  { name: 'bunq-init' }
>['options'];

export const BunqInitialiseModal = ({
  onSuccess,
}: BunqInitialiseModalProps) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide an API key.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!apiKey) {
      setIsValid(false);
      setError(t('It is required to provide an API key.'));
      return;
    }

    setIsLoading(true);

    const { error, reason } =
      (await send('secret-set', {
        name: 'bunq_apiKey',
        value: apiKey,
      })) || {};

    if (error) {
      setIsLoading(false);
      setIsValid(false);
      setError(getSecretsError(error, reason));
      return;
    }

    setIsValid(true);
    onSuccess();
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="bunq-init" containerProps={{ style: { width: '30vw' } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up bunq')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via bunq, you need to provide your
                bunq API key. You can learn how to generate it in the{' '}
                <Link
                  variant="external"
                  to="https://actualbudget.org/docs/advanced/bank-sync/"
                  linkColor="purple"
                >
                  bank sync documentation
                </Link>
                .
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('API Key:')} htmlFor="bunq-api-key-field" />
              <InitialFocus>
                <Input
                  id="bunq-api-key-field"
                  type="password"
                  value={apiKey}
                  onChangeValue={value => {
                    setApiKey(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
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
              <Trans>Save and continue</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
};
