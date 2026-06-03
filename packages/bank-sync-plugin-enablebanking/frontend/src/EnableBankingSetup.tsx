import * as React from 'react';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  ButtonWithLoading,
  FormError,
  Input,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  Text,
  View,
} from '@actual-app/plugins-core';
import type { BankSyncProviderSetupRenderProps } from '@actual-app/plugins-core';

function unwrapPluginResponse<T>(response: unknown): T {
  const typed = response as {
    status?: 'ok' | 'error';
    data?: T & { error_code?: string; error_type?: string };
    error?: string;
    reason?: string;
  };

  if (typed.status === 'error') {
    throw new Error(typed.reason || typed.error || 'Plugin request failed');
  }

  if (typed.data?.error_code) {
    throw new Error(
      typed.data.error_type ||
        'Could not validate the credentials. Please check your Application ID and secret key.',
    );
  }

  return typed.data as T;
}

export function EnableBankingSetup({
  callProvider,
  close,
  onError,
  onSuccess,
}: BankSyncProviderSetupRenderProps) {
  const { t } = useTranslation();
  const [applicationId, setApplicationId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [keyFileName, setKeyFileName] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    'It is required to provide both the Application ID and the secret key.',
  );

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSecretKey(await file.text());
      setKeyFileName(file.name);
      setIsValid(true);
    } catch {
      setSecretKey('');
      setKeyFileName('');
      setIsValid(false);
      setError('Failed to read the key file. Please try again.');
    }
  }

  async function onSubmit() {
    if (!applicationId || !secretKey) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    try {
      unwrapPluginResponse<{ configured: boolean }>(
        await callProvider({
          path: 'configure',
          body: { applicationId, secretKey },
        }),
      );
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
        title={t('Set up Enable Banking')}
        rightContent={<ModalCloseButton onPress={close} />}
      />
      <View style={{ display: 'flex', gap: 10, padding: 20, minWidth: 420 }}>
        <Text>
          In order to enable bank sync via Enable Banking (for EU banks), you
          will need to create application credentials. This can be done by
          creating an account at{' '}
          <a
            href="https://enablebanking.com/cp/applications"
            target="_blank"
            rel="noreferrer"
          >
            <Trans>Enable Banking</Trans>
          </a>
          .
        </Text>

        <Text>
          When setting up your application, use the following as the redirect
          URL: <code>{window.location.origin}/enablebanking/auth_callback</code>
        </Text>

        {window.location.protocol === 'http:' && (
          <FormError>
            Enable Banking requires HTTPS for the redirect URL. Your current
            connection is not secure.
          </FormError>
        )}

        <View style={{ gap: 4 }}>
          <Text>Application ID:</Text>
          <Input
            id="enablebanking-application-id-field"
            type="text"
            value={applicationId}
            onChangeValue={value => {
              setApplicationId(value);
              setIsValid(true);
            }}
          />
        </View>

        <View style={{ gap: 4 }}>
          <Text>Secret Key (.pem file):</Text>
          <input
            id="enablebanking-secret-key-field"
            type="file"
            accept=".pem,.key"
            onChange={onFileChange}
          />
        </View>

        {secretKey && (
          <Text style={{ fontSize: 12 }}>Loaded key file: {keyFileName}</Text>
        )}

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
          <Trans>Save and continue</Trans>
        </ButtonWithLoading>
      </ModalButtons>
    </>
  );
}
