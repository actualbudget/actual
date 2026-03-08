// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
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
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type AkahuInitialiseModalProps = Extract<
  ModalType,
  { name: 'akahu-init' }
>['options'];

export const AkahuInitialiseModal = ({
  onSuccess,
}: AkahuInitialiseModalProps) => {
  const { t } = useTranslation();
  const [appToken, setAppToken] = useState('');
  const [userToken, setUserToken] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('Both App Token and User Token are required.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!appToken || !userToken) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    const appTokenResult =
      (await send('secret-set', {
        name: 'akahu_appToken',
        value: appToken,
      })) || {};

    if (appTokenResult.error) {
      setIsValid(false);
      setError(getSecretsError(appTokenResult.error, appTokenResult.reason));
      setIsLoading(false);
      return;
    }

    const userTokenResult =
      (await send('secret-set', {
        name: 'akahu_userToken',
        value: userToken,
      })) || {};

    if (userTokenResult.error) {
      setIsValid(false);
      setError(getSecretsError(userTokenResult.error, userTokenResult.reason));
    } else {
      onSuccess();
    }

    setIsLoading(false);
    close();
  };

  return (
    <Modal name="akahu-init" containerProps={{ style: { width: 400 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up Akahu')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                To enable bank sync via{' '}
                <Link
                  variant="external"
                  to="https://akahu.nz"
                  linkColor="purple"
                >
                  Akahu
                </Link>{' '}
                (New Zealand banks), you need an App Token and User Token from
                your{' '}
                <Link
                  variant="external"
                  to="https://my.akahu.nz/developers"
                  linkColor="purple"
                >
                  Akahu developer account
                </Link>
                .
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('App Token:')} htmlFor="app-token-field" />
              <Input
                id="app-token-field"
                type="password"
                placeholder="app_token_..."
                value={appToken}
                onChangeValue={value => {
                  setAppToken(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            <FormField>
              <FormLabel title={t('User Token:')} htmlFor="user-token-field" />
              <Input
                id="user-token-field"
                type="password"
                placeholder="user_token_..."
                value={userToken}
                onChangeValue={value => {
                  setUserToken(value);
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
                void onSubmit(close);
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
