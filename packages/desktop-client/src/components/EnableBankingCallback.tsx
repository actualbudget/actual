import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';

import { Error as ErrorAlert } from './alerts';
import { Modal, ModalHeader } from './common/Modal';

export function EnableBankingCallback() {
  const { t } = useTranslation();
  const [searchParams, _] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const state = searchParams.get('state');
  const code = searchParams.get('code');

  useEffect(() => {
    const fetchData = async () => {
      if (!state || !code) {
        setError(
          t('Something went wrong during authentication. Please try again.'),
        );
        return;
      }
      try {
        await send('enablebanking-completeauth', { state, code });
        window.close();
      } catch (err) {
        console.error('Error completing Enable Banking authentication:', err);
        setError(
          t('Something went wrong during authentication. Please try again.'),
        );
      }
    };
    fetchData();
  }, [state, code, t]);
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
