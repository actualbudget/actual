// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { getSecretsError } from '@actual-app/core/shared/errors';

import { Error as ErrorAlert } from '#components/alerts';
import { Link } from '#components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { FormField, FormLabel } from '#components/forms';
import type { Modal as ModalType } from '#modals/modalsSlice';

type AkahuInitialiseModalProps = Extract<
  ModalType,
  { name: 'akahu-init' }
>['options'];

export const AkahuInitialiseModal = ({
  onSuccess,
}: AkahuInitialiseModalProps) => {
  const { t } = useTranslation();
  const [userToken, setUserToken] = useState('');
  const [appToken, setAppToken] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide a User Token and an App Token.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!userToken || !appToken) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);
    let hasError = false;

    const { error, reason } =
      (await send('secret-set', {
        name: 'akahu_userToken',
        value: userToken,
      })) || {};

    if (error) {
      setIsValid(false);
      setError(getSecretsError(error, reason));
      hasError = true;
    } else {
      const { error, reason } =
        (await send('secret-set', {
          name: 'akahu_appToken',
          value: appToken,
        })) || {};

      if (error) {
        setIsValid(false);
        setError(getSecretsError(error, reason));
        hasError = true;
      } else {
        onSuccess();
      }
    }
    setIsLoading(false);

    if (!hasError) {
      close();
    }
  };

  return (
    <Modal name="akahu-init" containerProps={{ style: { width: 300 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set-up Akahu')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via Akahu (only for New Zealand
                banks), you will need to create a token. This can be done by
                creating an account with{' '}
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
              <FormLabel title={t('User Token:')} htmlFor="userToken-field" />
              <Input
                id="userToken-field"
                type="password"
                value={userToken}
                onChangeValue={value => {
                  setUserToken(value);
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

            {!isValid && <ErrorAlert>{error}</ErrorAlert>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              autoFocus
              isLoading={isLoading}
              onPress={() => {
                void onSubmit(() => state.close());
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
