import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { SvgCheckCircle1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
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

type EnableBankingInitialiseProps = Extract<
  ModalType,
  { name: 'enablebanking-init' }
>['options'];

export function EnableBankingInitialiseModal({
  onSuccess,
}: EnableBankingInitialiseProps) {
  const { t } = useTranslation();
  const [applicationId, setApplicationId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [keyFileName, setKeyFileName] = useState('');
  const [error, setError] = useState(
    t('It is required to provide both the Application ID and the secret key.'),
  );

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setSecretKey(text);
      setKeyFileName(file.name);
      setIsValid(true);
    } catch {
      setSecretKey('');
      setKeyFileName('');
      setIsValid(false);
      setError(t('Failed to read the key file. Please try again.'));
    }
  }

  async function onSubmit(close: () => void) {
    if (!applicationId || !secretKey) {
      setIsValid(false);
      setError(
        t(
          'It is required to provide both the Application ID and the secret key.',
        ),
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await send('enablebanking-configure', {
        applicationId,
        secretKey,
      });

      if (result?.error) {
        setIsValid(false);
        setError(getSecretsError(result.error, result.reason));
        return;
      }

      if (result?.data?.error_code) {
        setIsValid(false);
        setError(
          result.data.error_type ||
            t(
              'Could not validate the credentials. Please check your Application ID and secret key.',
            ),
        );
        return;
      }

      setIsValid(true);
      onSuccess();
      close();
    } catch {
      setIsValid(false);
      setError(
        t(
          'Could not validate the credentials. Please check your Application ID and secret key.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      name="enablebanking-init"
      containerProps={{ style: { width: '30vw', minWidth: 420 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set up Enable Banking')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via Enable Banking (for EU banks)
                you will need to create application credentials. This can be
                done by creating an account at{' '}
                <Link
                  variant="external"
                  to="https://enablebanking.com/cp/applications"
                  linkColor="purple"
                >
                  Enable Banking
                </Link>
                .
              </Trans>
            </Text>

            <Text>
              <Trans>
                When setting up your application, use the following as the
                redirect URL:
              </Trans>{' '}
              <code>{window.location.origin}/enablebanking/auth_callback</code>
            </Text>

            {window.location.protocol === 'http:' && (
              <ErrorAlert>
                <Trans>
                  Enable Banking requires HTTPS for the redirect URL. Your
                  current connection is not secure.
                </Trans>
              </ErrorAlert>
            )}

            <FormField>
              <FormLabel
                title={t('Application ID:')}
                htmlFor="application-id-field"
              />
              <InitialFocus>
                <Input
                  id="application-id-field"
                  type="text"
                  value={applicationId}
                  onChangeValue={value => {
                    setApplicationId(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel
                title={t('Secret Key (.pem file):')}
                htmlFor="secret-key-field"
              />
              <input
                id="secret-key-field"
                type="file"
                accept=".pem,.key"
                onChange={onFileChange}
              />
            </FormField>

            {secretKey && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <SvgCheckCircle1
                  style={{ width: 14, height: 14, color: theme.noticeText }}
                />
                <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
                  {keyFileName}
                </Text>
              </View>
            )}

            {!isValid && <ErrorAlert>{error}</ErrorAlert>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
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
}
