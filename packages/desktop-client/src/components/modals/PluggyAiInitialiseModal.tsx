// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getSecretsError } from 'loot-core/shared/errors';
import { send } from 'loot-core/src/platform/client/fetch';

import { Error } from '../alerts';
import { ButtonWithLoading } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type PluggyAiInitialiseProps = {
  onSuccess: () => void;
};

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
            title={t('Set-up Pluggy.ai')} // Translated title
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              {t(
                'In order to enable bank-sync via Pluggy.ai (only for Brazilian banks) you will need to create access credentials. This can be done by creating an account with',
              )}{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/advanced/bank-sync/"
                linkColor="purple"
              >
                {t('Pluggy.ai')}
              </Link>
              .
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
              {t('Save and continue')}
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
};
