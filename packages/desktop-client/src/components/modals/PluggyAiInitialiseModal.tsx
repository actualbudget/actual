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

type PluggyAiInitialiseProps = Extract<
  ModalType,
  { name: 'pluggyai-init' }
>['options'];

export const PluggyAiInitialiseModal = ({
  onSuccess,
  fileId,
}: PluggyAiInitialiseProps) => {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [itemIds, setItemIds] = useState('');
  const [encryptSecrets, setEncryptSecrets] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t(
      'It is required to provide both the client id, client secret and at least one item id.',
    ),
  );

  const onSubmit = async (close: () => void) => {
    if (!clientId || !clientSecret || !itemIds) {
      setIsValid(false);
      setError(
        t(
          'It is required to provide both the client id, client secret and at least one item id.',
        ),
      );
      return;
    }
    const wantsEncryption =
      password?.trim() &&
      confirmPassword?.trim() &&
      password.trim() === confirmPassword.trim();
    if (encryptSecrets) {
      if (!wantsEncryption) {
        setIsValid(false);
        setError(
          t('Encryption password is required when encryption is enabled.'),
        );
        return;
      }
    } else if (password?.trim() !== confirmPassword?.trim()) {
      setIsValid(false);
      setError(t('Password and confirmation do not match.'));
      return;
    }

    setIsLoading(true);

    if (wantsEncryption) {
      for (const [name, value] of [
        ['pluggyai_clientId', clientId],
        ['pluggyai_clientSecret', clientSecret],
        ['pluggyai_itemIds', itemIds],
      ] as const) {
        const result =
          (await send('secret-set-encrypted', {
            name,
            value,
            password: password.trim(),
            fileId,
          })) || {};
        const { error: err, reason } = result;
        if (err) {
          setIsLoading(false);
          setIsValid(false);
          setError(getSecretsError(err, reason));
          return;
        }
      }
    } else {
      let result =
        (await send('secret-set', {
          name: 'pluggyai_clientId',
          value: clientId,
          fileId,
        })) || {};
      let { error: err, reason } = result;
      if (err) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(err, reason));
        return;
      }

      result =
        (await send('secret-set', {
          name: 'pluggyai_clientSecret',
          value: clientSecret,
          fileId,
        })) || {};
      ({ error: err, reason } = result);
      if (err) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(err, reason));
        return;
      }

      result =
        (await send('secret-set', {
          name: 'pluggyai_itemIds',
          value: itemIds,
          fileId,
        })) || {};
      ({ error: err, reason } = result);
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
    <Modal name="pluggyai-init" containerProps={{ style: { width: '30vw' } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up Pluggy.ai')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via Pluggy.ai (only for Brazilian
                banks) you will need to create access credentials. This can be
                done by creating an account with{' '}
                <Link
                  variant="external"
                  to="https://actualbudget.org/docs/advanced/bank-sync/"
                  linkColor="purple"
                >
                  Pluggy.ai
                </Link>
                .
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('Client ID:')} htmlFor="client-id-field" />
              <InitialFocus>
                <Input
                  id="client-id-field"
                  type="text"
                  value={clientId}
                  onChangeValue={value => {
                    setClientId(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel
                title={t('Client Secret:')}
                htmlFor="client-secret-field"
              />
              <Input
                id="client-secret-field"
                type="password"
                value={clientSecret}
                onChangeValue={value => {
                  setClientSecret(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            <FormField>
              <FormLabel
                title={t('Item Ids (comma separated):')}
                htmlFor="item-ids-field"
              />
              <Input
                id="item-ids-field"
                type="text"
                value={itemIds}
                placeholder="78a3db91-2b6f-4f33-914f-0c5f29c5e6b1, 47cdfe32-bef9-4b82-9ea5-41b89f207749"
                onChangeValue={value => {
                  setItemIds(value);
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
                  id="encrypt-pluggyai"
                  isOn={encryptSecrets}
                  onToggle={setEncryptSecrets}
                />
                <FormLabel
                  title={t('Encrypt secrets')}
                  htmlFor="encrypt-pluggyai"
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
