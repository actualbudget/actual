import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { Toggle } from '@actual-app/components/toggle';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

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
import { getSecretsError } from '#util/error';

type AkahuInitialiseModalProps = Extract<
  ModalType,
  { name: 'akahu-init' }
>['options'];

export const AkahuInitialiseModal = ({
  onSuccess,
  fileId,
  canSetGlobalCredentials = true,
  credentialSource,
}: AkahuInitialiseModalProps) => {
  const { t } = useTranslation();
  const [userToken, setUserToken] = useState('');
  const [appToken, setAppToken] = useState('');
  const [perBudgetFile, setPerBudgetFile] = useState(
    credentialSource ? credentialSource === 'per-budget-file' : true,
  );
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

    const userTokenResponse = await send('secret-set', {
      name: 'akahu_userToken',
      value: userToken,
      fileId,
      perBudgetFile,
    });
    const userTokenError =
      'error' in userTokenResponse && userTokenResponse.error
        ? String(userTokenResponse.error)
        : undefined;
    const userTokenReason =
      'reason' in userTokenResponse &&
      typeof userTokenResponse.reason === 'string'
        ? userTokenResponse.reason
        : '';

    if (userTokenError) {
      setIsValid(false);
      setError(getSecretsError(userTokenError, userTokenReason));
      hasError = true;
    } else {
      const appTokenResponse = await send('secret-set', {
        name: 'akahu_appToken',
        value: appToken,
        fileId,
        perBudgetFile,
      });
      const appTokenError =
        'error' in appTokenResponse && appTokenResponse.error
          ? String(appTokenResponse.error)
          : undefined;
      const appTokenReason =
        'reason' in appTokenResponse &&
        typeof appTokenResponse.reason === 'string'
          ? appTokenResponse.reason
          : '';

      if (appTokenError) {
        setIsValid(false);
        setError(getSecretsError(appTokenError, appTokenReason));
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

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Text>
                <Trans>For this budget only</Trans>
              </Text>
              <Toggle
                id="akahu-per-budget-file"
                isOn={perBudgetFile}
                isDisabled={
                  Boolean(credentialSource) || !canSetGlobalCredentials
                }
                onToggle={setPerBudgetFile}
              />
            </View>

            <FormField>
              <FormLabel title={t('App ID Token:')} htmlFor="appToken-field" />
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

            <FormField>
              <FormLabel
                title={t('User Access Token:')}
                htmlFor="userToken-field"
              />
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
