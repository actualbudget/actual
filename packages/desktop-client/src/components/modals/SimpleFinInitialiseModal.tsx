// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
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

type SimpleFinInitialiseModalProps = Extract<
  ModalType,
  { name: 'simplefin-init' }
>['options'];

export const SimpleFinInitialiseModal = ({
  onSuccess,
  fileId,
}: SimpleFinInitialiseModalProps) => {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [encryptSecrets, setEncryptSecrets] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(t('It is required to provide a token.'));

  const onSubmit = async (close: () => void) => {
    if (!token) {
      setIsValid(false);
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
      const { error: err, reason } =
        (await send('secret-set-encrypted', {
          name: 'simplefin_token',
          value: token,
          password,
          salt,
          fileId,
        })) || {};
      if (err) {
        setIsValid(false);
        setError(getSecretsError(err, reason));
      } else {
        onSuccess();
      }
    } else {
      const { error: err, reason } =
        (await send('secret-set', {
          name: 'simplefin_token',
          value: token,
          fileId,
        })) || {};
      if (err) {
        setIsValid(false);
        setError(getSecretsError(err, reason));
      } else {
        onSuccess();
      }
    }
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="simplefin-init" containerProps={{ style: { width: 300 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up SimpleFIN')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via SimpleFIN (only for North
                American banks), you will need to create a token. This can be
                done by creating an account with{' '}
                <Link
                  variant="external"
                  to="https://bridge.simplefin.org/"
                  linkColor="purple"
                >
                  SimpleFIN
                </Link>
                .
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('Token:')} htmlFor="token-field" />
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

            <FormField>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Toggle
                  id="encrypt-simplefin"
                  isOn={encryptSecrets}
                  onToggle={setEncryptSecrets}
                />
                <FormLabel
                  title={t('Encrypt secrets')}
                  htmlFor="encrypt-simplefin"
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
