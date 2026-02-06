// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { Toggle } from '@actual-app/components/toggle';
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

function generateSalt(): string {
  const bytes = new Uint8Array(32);
  const cryptoObj =
    typeof globalThis !== 'undefined' &&
    (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return btoa(String.fromCharCode(...bytes));
}

type GoCardlessInitialiseModalProps = Extract<
  ModalType,
  { name: 'gocardless-init' }
>['options'];

export const GoCardlessInitialiseModal = ({
  onSuccess,
  fileId,
}: GoCardlessInitialiseModalProps) => {
  const { t } = useTranslation();
  const [secretId, setSecretId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [encryptSecrets, setEncryptSecrets] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide both the secret id and secret key.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!secretId || !secretKey) {
      setIsValid(false);
      setError(
        t('It is required to provide both the secret id and secret key.'),
      );
      return;
    }
    if (encryptSecrets) {
      if (!password || password.length < 1) {
        setIsValid(false);
        setError(
          t('Encryption password is required when encryption is enabled.'),
        );
        return;
      }
      if (password !== confirmPassword) {
        setIsValid(false);
        setError(t('Password and confirmation do not match.'));
        return;
      }
    }

    setIsLoading(true);

    if (encryptSecrets && password) {
      const salt = generateSalt();
      let { error: err, reason } =
        (await send('secret-set-encrypted', {
          name: 'gocardless_secretId',
          value: secretId,
          password,
          salt,
          fileId,
        })) || {};
      if (err) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(err, reason));
        return;
      }
      ({ error: err, reason } =
        (await send('secret-set-encrypted', {
          name: 'gocardless_secretKey',
          value: secretKey,
          password,
          salt,
          fileId,
        })) || {});
      if (err) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(err, reason));
        return;
      }
    } else {
      let { error: err, reason } =
        (await send('secret-set', {
          name: 'gocardless_secretId',
          value: secretId,
          fileId,
        })) || {};
      if (err) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(err, reason));
        return;
      }
      ({ error: err, reason } =
        (await send('secret-set', {
          name: 'gocardless_secretKey',
          value: secretKey,
          fileId,
        })) || {});
      if (err) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(err, reason));
        return;
      }
    }

    setIsValid(true);
    onSuccess();
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="gocardless-init" containerProps={{ style: { width: '30vw' } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up GoCardless')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via GoCardless (only for EU banks)
                you will need to create access credentials. This can be done by
                creating an account with{' '}
                <Link
                  variant="external"
                  to="https://actualbudget.org/docs/advanced/bank-sync/"
                  linkColor="purple"
                >
                  GoCardless
                </Link>
                .
              </Trans>
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

            <FormField>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Toggle
                  id="encrypt-gocardless"
                  isOn={encryptSecrets}
                  onToggle={setEncryptSecrets}
                />
                <FormLabel
                  title={t('Encrypt secrets')}
                  htmlFor="encrypt-gocardless"
                />
              </View>
            </FormField>

            {encryptSecrets && (
              <>
                <FormField>
                  <FormLabel
                    title={t('Encryption password:')}
                    htmlFor="encrypt-password-field"
                  />
                  <Input
                    id="encrypt-password-field"
                    type="password"
                    value={password}
                    onChangeValue={value => {
                      setPassword(value);
                      setIsValid(true);
                    }}
                  />
                </FormField>
                <FormField>
                  <FormLabel
                    title={t('Confirm password:')}
                    htmlFor="encrypt-confirm-field"
                  />
                  <Input
                    id="encrypt-confirm-field"
                    type="password"
                    value={confirmPassword}
                    onChangeValue={value => {
                      setConfirmPassword(value);
                      setIsValid(true);
                    }}
                  />
                </FormField>
              </>
            )}

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
