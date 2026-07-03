// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { css } from '@emotion/css';

import { Error } from '#components/alerts';
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

type OpenBankingIoInitialiseModalProps = Extract<
  ModalType,
  { name: 'openbankingio-init' }
>['options'];

export const OpenBankingIoInitialiseModal = ({
  onSuccess,
}: OpenBankingIoInitialiseModalProps) => {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide the credentials.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!credentials) {
      setIsValid(false);
      setError(t('It is required to provide the credentials.'));
      return;
    }

    try {
      JSON.parse(credentials);
    } catch {
      setIsValid(false);
      setError(t('The credentials must be valid JSON.'));
      return;
    }

    setIsLoading(true);

    const { error, reason } =
      (await send('secret-set', {
        name: 'openbankingio_credentials',
        value: credentials,
      })) || {};

    if (error) {
      setIsValid(false);
      setError(getSecretsError(error, reason));
      setIsLoading(false);
      // Keep the modal open so the user can correct the credentials rather
      // than closing silently on a failed save.
      return;
    }

    onSuccess();
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="openbankingio-init" containerProps={{ style: { width: 300 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set-up open-banking.io')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via open-banking.io (only for
                European banks), you will need to create an account and download
                your credentials. This can be done by creating an account with{' '}
                <Link
                  variant="external"
                  to="https://open-banking.io/"
                  linkColor="purple"
                >
                  open-banking.io
                </Link>
                .
              </Trans>
            </Text>

            <FormField>
              <FormLabel
                title={t('Credentials (credentials.json):')}
                htmlFor="credentials-field"
              />
              <textarea
                id="credentials-field"
                aria-label={t('Credentials (credentials.json)')}
                className={css({
                  width: '100%',
                  minHeight: 120,
                  resize: 'vertical',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.4,
                  padding: '8px 10px',
                  borderRadius: 4,
                  border: `1px solid ${theme.formInputBorder}`,
                  backgroundColor: theme.tableBackground,
                  color: theme.tableText,
                  '::placeholder': { color: theme.pageTextLight },
                })}
                value={credentials}
                onChange={e => {
                  setCredentials(e.target.value);
                  setIsValid(true);
                }}
                placeholder={t('Paste the contents of credentials.json here')}
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
