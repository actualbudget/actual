// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
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

type AkahuInitialiseModalProps = Extract<
  ModalType,
  { name: 'akahu-init' }
>['options'];

export const AkahuInitialiseModal = ({
  onSuccess,
}: AkahuInitialiseModalProps) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [appToken, setAppToken] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(t('It is required to provide an API Key and an App Token.'));

  const onSubmit = async (close: () => void) => {
    if (!apiKey || !appToken) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    const { error, reason } =
      (await send('secret-set', {
        name: 'akahu_apiKey',
        value: apiKey,
      })) || {};

    if (error) {
      setIsValid(false);
      setError(getSecretsError(error, reason));
    } else {
      const { error, reason } =
        (await send('secret-set', {
          name: 'akahu_appToken',
          value: appToken,
        })) || {};

      if (error) {
        setIsValid(false);
        setError(getSecretsError(error, reason));
      } else {
        onSuccess();
      }
    }
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="akahu-init" containerProps={{ style: { width: 300 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set-up Akahu')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via Akahu (only for New
                Zealand banks), you will need to create a token. This can be
                done by creating an account with{' '}
                <Link
                  variant="external"
                  to="https://my.akahu.nz/"
                  linkColor="purple"
                >
                  Akahu
                </Link>
                .
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('API Key:')} htmlFor="apiKey-field" />
              <Input
                id="apiKey-field"
                type="password"
                value={apiKey}
                onChangeValue={value => {
                  setApiKey(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            <FormField>
              <FormLabel title={t('App Token:')} htmlFor="appToken-field" />
              <Input
                id="appToken-field"
                type="password"
                value={appToken}
                onChangeValue={value => {
                  setAppToken(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            {!isValid && <Error>{error}</Error>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              autoFocus
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
