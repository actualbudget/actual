import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';

import { Error as ErrorAlert } from './alerts';
import { Modal, ModalHeader } from './common/Modal';

import { useUrlParam } from '@desktop-client/hooks/useUrlParam';

export function EnableBankingCallback() {
  const { t } = useTranslation();
  const [state] = useUrlParam('state');
  const [code] = useUrlParam('code');
  const [errorParam] = useUrlParam('error');
  const [errorDescription] = useUrlParam('error_description');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // If Enable Banking returned an error, fail the auth flow
      if (errorParam && state) {
        const errorMessage = errorDescription || errorParam;
        await send('enablebanking-failauth', { state, error: errorMessage });
        setError(
          t('Authentication failed: {{error}}', { error: errorMessage }),
        );
        return;
      }

      if (!state || !code) {
        setError(
          t('Something went wrong during authentication. Please try again.'),
        );
        return;
      }
      try {
        const { error } = await send('enablebanking-completeauth', {
          state,
          code,
        });
        if (error) {
          setError(
            t('Something went wrong during authentication. Please try again.'),
          );
          return;
        }
        window.close();
      } catch {
        setError(
          t('Something went wrong during authentication. Please try again.'),
        );
      }
    };
    fetchData();
  }, [state, code, errorParam, errorDescription, t]);
  return (
    <Modal name="enablebanking-callback" isDismissable={false}>
      <ModalHeader title={t('Account sync')} />
      <View style={{ maxWidth: 500 }}>
        {!error ? (
          <View>
            <Paragraph>
              <Trans>Please wait...</Trans>
            </Paragraph>
            <Paragraph>
              <Trans>
                The window should close automatically. If nothing happened you
                can close this window or tab.
              </Trans>
            </Paragraph>
          </View>
        ) : (
          <ErrorAlert style={{ alignSelf: 'center', marginBottom: 10 }}>
            {error}
          </ErrorAlert>
        )}
      </View>
    </Modal>
  );
}
