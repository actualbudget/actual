import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Error } from '@desktop-client/components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type BankSyncInitialiseProps = Extract<
  ModalType,
  { name: 'bank-sync-init' }
>['options'];

export function BankSyncInitialiseModal({
  providerSlug: _providerSlug,
  providerDisplayName,
  onSuccess,
}: BankSyncInitialiseProps) {
  const { t } = useTranslation();
  const [credentialsJson, setCredentialsJson] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');

  function onSubmit(close: () => void) {
    if (!credentialsJson.trim()) {
      setIsValid(false);
      setError(t('Credentials JSON is required.'));
      return;
    }

    // Validate JSON
    try {
      const parsedCredentials = JSON.parse(credentialsJson);
      setIsValid(true);
      onSuccess(parsedCredentials);
      close();
    } catch (err) {
      setIsValid(false);
      setError(t('Invalid JSON format. Please check your input.'));
    }
  }

  return (
    <Modal name="bank-sync-init" containerProps={{ style: { width: '40vw' } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Set up {{provider}}', { provider: providerDisplayName })}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                Enter your API credentials as a JSON object. The plugin will
                securely store these credentials.
              </Trans>
            </Text>

            <Text style={{ fontSize: 12, color: 'var(--color-n8)' }}>
              <Trans>Example:</Trans>
            </Text>
            <View
              style={{
                backgroundColor: 'var(--color-n1)',
                padding: 10,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre',
              }}
            >
              {/* eslint-disable actual/typography */}
              {`{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "itemIds": "id1,id2,id3"
}`}
              {/* eslint-enable actual/typography */}
            </View>

            <FormField>
              <FormLabel
                title={t('Credentials (JSON):')}
                htmlFor="credentials-field"
              />
              <InitialFocus>
                <textarea
                  id="credentials-field"
                  value={credentialsJson}
                  onChange={e => {
                    setCredentialsJson(e.target.value);
                    setIsValid(true);
                  }}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '8px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-n1)',
                    color: 'var(--color-n9)',
                    resize: 'vertical',
                  }}
                  // eslint-disable-next-line actual/typography
                  placeholder='{"clientId": "…", "clientSecret": "…"}'
                />
              </InitialFocus>
            </FormField>

            {!isValid && <Error>{error}</Error>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
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
}
