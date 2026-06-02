import * as React from 'react';
import { useState } from 'react';

import {
  ButtonWithLoading,
  FormError,
  Input,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  Text,
  View,
  type BankSyncProviderSetupRenderProps,
} from '@actual-app/plugins-core';

export function GoCardlessSetup({
  close,
  onError,
  onSuccess,
  setSecret,
}: BankSyncProviderSetupRenderProps) {
  const [secretId, setSecretId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    'It is required to provide both the secret id and secret key.',
  );

  async function onSubmit() {
    if (!secretId || !secretKey) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    try {
      await setSecret({ key: 'secretId', value: secretId });
      await setSecret({ key: 'secretKey', value: secretKey });
      setIsValid(true);
      onSuccess();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : String(submitError);
      setIsValid(false);
      setError(message);
      onError(submitError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <ModalHeader
        title="Set up GoCardless"
        rightContent={<ModalCloseButton onPress={close} />}
      />
      <View style={{ display: 'flex', gap: 10, padding: 20, minWidth: 360 }}>
        <Text>
          In order to enable bank sync via GoCardless (only for EU banks), you
          will need to create access credentials. This can be done by creating
          an account with{' '}
          <a
            href="https://actualbudget.org/docs/advanced/bank-sync/"
            target="_blank"
            rel="noreferrer"
          >
            GoCardless
          </a>
          .
        </Text>

        <View style={{ gap: 4 }}>
          <Text>Secret ID:</Text>
          <Input
            id="gocardless-secret-id-field"
            type="password"
            value={secretId}
            onChangeValue={value => {
              setSecretId(value);
              setIsValid(true);
            }}
          />
        </View>

        <View style={{ gap: 4 }}>
          <Text>Secret Key:</Text>
          <Input
            id="gocardless-secret-key-field"
            type="password"
            value={secretKey}
            onChangeValue={value => {
              setSecretKey(value);
              setIsValid(true);
            }}
          />
        </View>

        {!isValid && <FormError>{error}</FormError>}
      </View>

      <ModalButtons>
        <ButtonWithLoading
          variant="primary"
          type="button"
          autoFocus
          isDisabled={isLoading}
          isLoading={isLoading}
          onPress={() => {
            void onSubmit();
          }}
        >
          Save and continue
        </ButtonWithLoading>
      </ModalButtons>
    </>
  );
}
