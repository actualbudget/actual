import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

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

type FinTSInitialiseModalProps = Extract<
  ModalType,
  { name: 'fints-init' }
>['options'];

export function FinTSInitialiseModal({ onSuccess }: FinTSInitialiseModalProps) {
  const { t } = useTranslation();
  const [productId, setProductId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (close: () => void) => {
    const trimmed = productId.trim();
    if (!/^[0-9A-Za-z]{25}$/.test(trimmed)) {
      setError(t('The registration number has exactly 25 characters.'));
      return;
    }

    setIsLoading(true);
    const { error, reason } =
      (await send('secret-set', {
        name: 'fints_productId',
        value: trimmed,
      })) || {};
    setIsLoading(false);

    if (error) {
      setError(getSecretsError(error, reason));
      return;
    }

    onSuccess();
    close();
  };

  return (
    <Modal name="fints-init" containerProps={{ style: { width: 400 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set-up FinTS')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                FinTS connects directly to German banks with your online banking
                login. German banks only accept registered software, so you need
                a free FinTS product registration number from the{' '}
                <Link
                  variant="external"
                  to="https://www.hbci-zka.de/register/prod_register.htm"
                  linkColor="purple"
                >
                  Deutsche Kreditwirtschaft
                </Link>
                . The number is personal; do not share it.
              </Trans>
            </Text>

            <FormField>
              <FormLabel
                title={t('Product registration number:')}
                htmlFor="fints-product-id-field"
              />
              <Input
                id="fints-product-id-field"
                type="password"
                autoComplete="off"
                value={productId}
                onChangeValue={value => {
                  setProductId(value);
                  setError(null);
                }}
              />
            </FormField>

            {error && <ErrorAlert>{error}</ErrorAlert>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              autoFocus
              isLoading={isLoading}
              onPress={() => void onSubmit(() => state.close())}
            >
              <Trans>Save and continue</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
