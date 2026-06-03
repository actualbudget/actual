import * as React from 'react';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import {
  ButtonWithLoading,
  FormError,
  Input,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  Text,
  View,
} from '@actual-app/plugins-core';
import type { BankSyncProviderSetupRenderProps } from '@actual-app/plugins-core';

export function PluggyAiSetup({
  close,
  onError,
  onSuccess,
  setSecret,
}: BankSyncProviderSetupRenderProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [itemIds, setItemIds] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    'It is required to provide the client id, client secret, and at least one item id.',
  );

  async function onSubmit() {
    if (!clientId || !clientSecret || !itemIds) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);

    try {
      await setSecret({ key: 'clientId', value: clientId });
      await setSecret({ key: 'clientSecret', value: clientSecret });
      await setSecret({ key: 'itemIds', value: itemIds });
      setIsValid(true);
      onSuccess();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : String(submitError);
      setIsValid(false);
      setError(message);
      onError(submitError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <ModalHeader
        title={t('Set-up Pluggy.ai')}
        rightContent={<ModalCloseButton onPress={close} />}
      />
      <View style={{ display: 'flex', gap: 10, padding: 20, minWidth: 360 }}>
        <Text>
          In order to enable bank sync via Pluggy.ai (only for Brazilian banks),
          you will need to create access credentials. This can be done by
          creating an account with{' '}
          <a
            href="https://actualbudget.org/docs/advanced/bank-sync/"
            target="_blank"
            rel="noreferrer"
          >
            <Trans>Pluggy.ai</Trans>
          </a>
          .
        </Text>

        <View style={{ gap: 4 }}>
          <Text>Client ID:</Text>
          <Input
            id="pluggy-client-id-field"
            type="text"
            value={clientId}
            onChangeValue={value => {
              setClientId(value);
              setIsValid(true);
            }}
          />
        </View>

        <View style={{ gap: 4 }}>
          <Text>Client Secret:</Text>
          <Input
            id="pluggy-client-secret-field"
            type="password"
            value={clientSecret}
            onChangeValue={value => {
              setClientSecret(value);
              setIsValid(true);
            }}
          />
        </View>

        <View style={{ gap: 4 }}>
          <Text>Item Ids (comma separated):</Text>
          <Input
            id="pluggy-item-ids-field"
            type="text"
            value={itemIds}
            placeholder="78a3db91-2b6f-4f33-914f-0c5f29c5e6b1, 47cdfe32-bef9-4b82-9ea5-41b89f207749"
            onChangeValue={value => {
              setItemIds(value);
              setIsValid(true);
            }}
          />
        </View>

        {!isValid && <FormError>{error}</FormError>}
      </View>

      <ModalButtons>
        <ButtonWithLoading
          variant="primary"
          type="button"
          autoFocus
          isDisabled={isLoading}
          isLoading={isLoading}
          onPress={() => {
            void onSubmit();
          }}
        >
          <Trans>Save and continue</Trans>
        </ButtonWithLoading>
      </ModalButtons>
    </>
  );
}
