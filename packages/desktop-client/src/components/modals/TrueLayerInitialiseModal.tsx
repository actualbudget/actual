import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { useAuth } from '#auth/AuthProvider';
import { Permissions } from '#auth/types';
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

type TrueLayerInitialiseProps = Extract<
  ModalType,
  { name: 'truelayer-init' }
>['options'];

export function TrueLayerInitialiseModal({
  onSuccess,
}: TrueLayerInitialiseProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(Permissions.ADMINISTRATOR);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide both the client ID and the client secret.'),
  );

  async function onSubmit(close: () => void) {
    if (!isAdmin) return;
    if (!clientId || !clientSecret) {
      setIsValid(false);
      setError(
        t(
          'It is required to provide both the client ID and the client secret.',
        ),
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await send('truelayer-configure', {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });

      if (result?.error) {
        setIsValid(false);
        setError(getSecretsError(result.error, result.reason));
        return;
      }

      if (result?.error_code) {
        setIsValid(false);
        setError(
          result.error_type ||
            t(
              'Could not validate the credentials. Please check your client ID and client secret.',
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
          'Could not validate the credentials. Please check your client ID and client secret.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      name="truelayer-init"
      containerProps={{ style: { width: '30vw', minWidth: 420 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set up TrueLayer')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            {!isAdmin && (
              <ErrorAlert>
                <Trans>Only an administrator can configure TrueLayer.</Trans>
              </ErrorAlert>
            )}
            <Text>
              <Trans>
                In order to enable bank sync via TrueLayer (for UK banks) you
                will need to create a live application in the{' '}
                <Link
                  variant="external"
                  to="https://console.truelayer.com"
                  linkColor="purple"
                >
                  TrueLayer Console
                </Link>{' '}
                with the Data product enabled.
              </Trans>
            </Text>

            <Text>
              <Trans>Add the following redirect URI to the application:</Trans>{' '}
              <code>{window.location.origin}/truelayer/auth_callback</code>
            </Text>

            {window.location.protocol === 'http:' && (
              <ErrorAlert>
                <Trans>
                  TrueLayer requires HTTPS for the redirect URI. Your current
                  connection is not secure.
                </Trans>
              </ErrorAlert>
            )}

            <FormField>
              <FormLabel title={t('Client ID:')} htmlFor="client-id-field" />
              <InitialFocus>
                <Input
                  disabled={!isAdmin}
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
                title={t('Client secret:')}
                htmlFor="client-secret-field"
              />
              <Input
                disabled={!isAdmin}
                id="client-secret-field"
                type="password"
                value={clientSecret}
                onChangeValue={value => {
                  setClientSecret(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            {!isValid && <ErrorAlert>{error}</ErrorAlert>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading}
              isDisabled={!isAdmin}
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
