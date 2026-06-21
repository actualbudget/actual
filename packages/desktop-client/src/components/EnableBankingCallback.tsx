import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { Error as ErrorAlert } from '#components/alerts';
import { useUrlParam } from '#hooks/useUrlParam';

export function EnableBankingCallback() {
  const { t } = useTranslation();
  const [code] = useUrlParam('code');
  const [stateParam] = useUrlParam('state');
  const [errorParam] = useUrlParam('error');
  const storedState = localStorage.getItem('enablebanking_auth_state');
  const stateValid =
    typeof stateParam === 'string' &&
    typeof storedState === 'string' &&
    stateParam === storedState;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function handleCallback() {
      if (errorParam) {
        setStatus('error');
        setErrorMessage(
          t('Authorization was denied or failed: {{error}}', {
            error: errorParam,
          }),
        );
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage(t('Missing authorization parameters.'));
        return;
      }

      if (!stateValid) {
        localStorage.removeItem('enablebanking_auth_state');
        setStatus('error');
        setErrorMessage(t('Authorization state mismatch. Please try again.'));
        return;
      }

      try {
        const result = await send('enablebanking-complete-auth', {
          code,
          state: stateParam,
        });

        if (result.error) {
          setStatus('error');
          setErrorMessage(
            result.error.message || t('Failed to complete authorization.'),
          );
          return;
        }

        setStatus('success');
        localStorage.removeItem('enablebanking_auth_state');

        // Auto-close after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } catch {
        setStatus('error');
        setErrorMessage(t('An unexpected error occurred.'));
      }
    }

    void handleCallback();
  }, [code, stateParam, stateValid, errorParam, t]);

  return (
    <View
      style={{
        padding: 20,
        maxWidth: 500,
        margin: '40px auto',
        textAlign: 'center',
      }}
    >
      {status === 'loading' && (
        <Paragraph>
          <Trans>Completing authorization...</Trans>
        </Paragraph>
      )}

      {status === 'success' && (
        <Paragraph>
          <Trans>
            Authorization successful! This window will close automatically.
          </Trans>
        </Paragraph>
      )}

      {status === 'error' && (
        <>
          <ErrorAlert>{errorMessage}</ErrorAlert>
          <Paragraph style={{ marginTop: 10 }}>
            <Trans>You can close this window and try again.</Trans>
          </Paragraph>
        </>
      )}
    </View>
  );
}
