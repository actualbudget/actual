import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
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

type EnableBankingInitialiseProps = Extract<
  ModalType,
  { name: 'enablebanking-init' }
>['options'];

export function EnableBankingInitialiseModal({
  onSuccess,
}: EnableBankingInitialiseProps) {
  const { t } = useTranslation();
  const [appId, setAppId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide both the Application ID and Private Key.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!appId || !privateKey) {
      setIsValid(false);
      setError(
        t('It is required to provide both the Application ID and Private Key.'),
      );
      return;
    }

    setIsLoading(true);

    let { error, reason } =
      (await send('secret-set', {
        name: 'enablebanking_appId',
        value: appId,
      })) || {};

    if (error) {
      setIsLoading(false);
      setIsValid(false);
      setError(getSecretsError(error, reason));
      return;
    }

    ({ error, reason } =
      (await send('secret-set', {
        name: 'enablebanking_privateKey',
        value: privateKey,
      })) || {});

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
    <Modal
      name="enablebanking-init"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set-up Enable Banking')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via Enable Banking you will need to
                create an application and obtain API credentials. Visit{' '}
                <Link
                  variant="external"
                  to="https://enablebanking.com"
                  linkColor="purple"
                >
                  Enable Banking
                </Link>{' '}
                to create an account and generate your Application ID and
                Private Key.
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('Application ID:')} htmlFor="app-id-field" />
              <InitialFocus>
                <Input
                  id="app-id-field"
                  type="text"
                  value={appId}
                  onChangeValue={value => {
                    setAppId(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel
                title={t('Private Key (PEM format):')}
                htmlFor="private-key-field"
              />
              <textarea
                id="private-key-field"
                value={privateKey}
                onChange={e => {
                  setPrivateKey(e.target.value);
                  setIsValid(true);
                }}
                rows={6}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '8px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
              />
            </FormField>

            {!isValid && <Error>{error}</Error>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
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
}
