// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
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

type PluggyAiInitialiseProps = Extract<
  ModalType,
  { name: 'pluggyai-init' }
>['options'];

export const PluggyAiInitialiseModal = ({
  onSuccess,
}: PluggyAiInitialiseProps) => {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [itemIds, setItemIds] = useState('');
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

    setIsLoading(true);

    let { error, reason } =
      (await send('secret-set', {
        name: 'pluggyai_clientId',
        value: clientId,
      })) || {};

    if (error) {
      setIsLoading(false);
      setIsValid(false);
      setError(getSecretsError(error, reason));
      return;
    } else {
      ({ error, reason } =
        (await send('secret-set', {
          name: 'pluggyai_clientSecret',
          value: clientSecret,
        })) || {});
      if (error) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(error, reason));
        return;
      } else {
        ({ error, reason } =
          (await send('secret-set', {
            name: 'pluggyai_itemIds',
            value: itemIds,
          })) || {});

        if (error) {
          setIsLoading(false);
          setIsValid(false);
          setError(getSecretsError(error, reason));
          return;
        }
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
            title={t('Set-up Pluggy.ai')}
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
