import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
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

type LhvInitialiseModalProps = Extract<
  ModalType,
  { name: 'lhv-init' }
>['options'];

export function LhvInitialiseModal({ onSuccess }: LhvInitialiseModalProps) {
  const { t } = useTranslation();
  const { cloudFileId, isAdmin, isFileOwner } = useCurrentAccess();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(close: () => void) {
    const refreshToken = token.trim();
    if (!refreshToken) {
      setError(t('It is required to provide a token.'));
      return;
    }
    if (!cloudFileId) {
      setError(t('Budget file ID is required.'));
      return;
    }
    if (!isAdmin && !isFileOwner) {
      setError(
        t(
          'Only the budget file owner or a server administrator can replace this token.',
        ),
      );
      return;
    }

    setIsLoading(true);
    const response = await send('secret-set', {
      name: 'lhv_refreshToken',
      value: refreshToken,
      fileId: cloudFileId,
    });

    if (response?.error || response?.error_code) {
      setIsLoading(false);
      setError(
        getSecretsError(response.error ?? response.error_code, response.reason),
      );
      return;
    }

    const accountResponse = await send('lhv-accounts');
    setIsLoading(false);

    if (accountResponse.error_code || accountResponse.error) {
      if (accountResponse.error_code === 'INVALID_ACCESS_TOKEN') {
        await send('secret-set', {
          name: 'lhv_refreshToken',
          value: null,
          fileId: cloudFileId,
        });
      }
      setError(
        accountResponse.reason ||
          accountResponse.error ||
          accountResponse.error_code,
      );
      return;
    }

    const accounts = accountResponse.accounts ?? [];
    if (accounts.length === 0) {
      setError(
        t(
          'The token is valid, but LHV.ai returned no accounts. Confirm that account access was granted when generating the token.',
        ),
      );
      return;
    }

    close();
    onSuccess(accounts);
  }

  return (
    <Modal name="lhv-init" containerProps={{ style: { width: 340 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set Up LHV.ai')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                Generate a refresh token on the{' '}
                <Link
                  variant="external"
                  to="https://api.lhv.ai/api-access"
                  linkColor="purple"
                >
                  LHV.ai API access page
                </Link>
                , then paste it below. The token expires after 30 days.
              </Trans>
            </Text>
            <FormField>
              <FormLabel title={t('Refresh token:')} htmlFor="lhv-token" />
              <Input
                id="lhv-token"
                type="password"
                value={token}
                onChangeValue={value => {
                  setToken(value);
                  setError(null);
                }}
              />
            </FormField>
            {error && <Error>{error}</Error>}
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
