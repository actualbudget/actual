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

type StripeInitialiseProps = Extract<
  ModalType,
  { name: 'stripe-init' }
>['options'];

export function StripeInitialiseModal({ onSuccess }: StripeInitialiseProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(Permissions.ADMINISTRATOR);
  const [key, setKey] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(t('It is required to provide a key.'));

  async function onSubmit(close: () => void) {
    if (!isAdmin) return;
    if (!key) {
      setIsValid(false);
      setError(t('It is required to provide a key.'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await send('stripe-configure', { key: key.trim() });

      if (result?.error) {
        setIsValid(false);
        setError(getSecretsError(result.error, result.reason));
        return;
      }

      if (result?.error_code) {
        setIsValid(false);
        setError(
          result.error_type ||
            t('Could not validate the key. Please check it and try again.'),
        );
        return;
      }

      setIsValid(true);
      onSuccess();
      close();
    } catch {
      setIsValid(false);
      setError(t('Could not validate the key. Please check it and try again.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      name="stripe-init"
      containerProps={{ style: { width: '30vw', minWidth: 420 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set up Stripe')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            {!isAdmin && (
              <ErrorAlert>
                <Trans>Only an administrator can configure Stripe.</Trans>
              </ErrorAlert>
            )}
            <Text>
              <Trans>
                In order to import Stripe transactions you will need a
                restricted key from the{' '}
                <Link
                  variant="external"
                  to="https://dashboard.stripe.com/apikeys"
                  linkColor="purple"
                >
                  Stripe Dashboard
                </Link>{' '}
                with read access to balance and balance transactions.
              </Trans>
            </Text>

            <FormField>
              <FormLabel
                title={t('Restricted key:')}
                htmlFor="stripe-key-field"
              />
              <InitialFocus>
                <Input
                  disabled={!isAdmin}
                  id="stripe-key-field"
                  type="password"
                  value={key}
                  onChangeValue={value => {
                    setKey(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
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
