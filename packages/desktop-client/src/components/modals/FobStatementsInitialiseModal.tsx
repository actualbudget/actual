import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { Toggle } from '@actual-app/components/toggle';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { Error } from '#components/alerts';
import { Link } from '#components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { FormField, FormLabel } from '#components/forms';
import { useCurrentAccess } from '#hooks/useCurrentAccess';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { getSecretsError } from '#util/error';

type FobStatementsInitialiseProps = Extract<
  ModalType,
  { name: 'fobstatements-init' }
>['options'];

type SecretSetResponse = {
  error?: string;
  reason?: string;
};

export const FobStatementsInitialiseModal = ({
  onSuccess,
  credentialSource,
}: FobStatementsInitialiseProps) => {
  const { t } = useTranslation();
  const { cloudFileId, isAdmin: canSetGlobalCredentials } = useCurrentAccess();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [perBudgetFile, setPerBudgetFile] = useState(
    credentialSource === 'per-budget-file' || !canSetGlobalCredentials,
  );
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide both the API key and API secret.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!apiKey || !apiSecret) {
      setIsValid(false);
      setError(t('It is required to provide both the API key and API secret.'));
      return;
    }

    setIsLoading(true);

    const fileId = perBudgetFile ? cloudFileId : null;
    if (perBudgetFile && !fileId) {
      setIsLoading(false);
      setIsValid(false);
      setError(t('Budget file ID is required.'));
      return;
    }

    const secrets: Array<{ name: string; value: string }> = [
      { name: 'fobstatements_apiKey', value: apiKey },
      { name: 'fobstatements_apiSecret', value: apiSecret },
      // The API URL is optional; only persist it when provided so the server
      // falls back to the default host otherwise.
      { name: 'fobstatements_apiUrl', value: apiUrl.trim() },
    ];

    for (const secret of secrets) {
      const result: SecretSetResponse =
        (await send('secret-set', {
          name: secret.name,
          value: secret.value,
          fileId,
        })) ?? {};

      if (result.error) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(result.error, result.reason ?? ''));
        return;
      }
    }

    setIsValid(true);
    onSuccess(perBudgetFile);
    setIsLoading(false);
    close();
  };

  return (
    <Modal
      name="fobstatements-init"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set-up FOB Statements')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                In order to enable bank sync via FOB Statements you will need to
                create API credentials in your{' '}
                <Link
                  variant="external"
                  to="https://statements.finopsbricks.com/"
                  linkColor="purple"
                >
                  FOB Statements
                </Link>{' '}
                organization settings.
              </Trans>
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Text>
                <Trans>For this budget only</Trans>
              </Text>
              <Toggle
                id="fobstatements-per-budget-file"
                isOn={perBudgetFile}
                isDisabled={!canSetGlobalCredentials}
                onToggle={setPerBudgetFile}
              />
            </View>

            <FormField>
              <FormLabel title={t('API key:')} htmlFor="api-key-field" />
              <InitialFocus>
                <Input
                  id="api-key-field"
                  type="text"
                  value={apiKey}
                  onChangeValue={value => {
                    setApiKey(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel title={t('API secret:')} htmlFor="api-secret-field" />
              <Input
                id="api-secret-field"
                type="password"
                value={apiSecret}
                onChangeValue={value => {
                  setApiSecret(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            <FormField>
              <FormLabel
                title={t('API URL (optional):')}
                htmlFor="api-url-field"
              />
              <Input
                id="api-url-field"
                type="text"
                value={apiUrl}
                placeholder="https://statements.finopsbricks.com"
                onChangeValue={value => {
                  setApiUrl(value);
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
