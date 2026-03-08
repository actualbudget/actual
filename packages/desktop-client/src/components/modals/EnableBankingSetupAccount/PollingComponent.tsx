import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/connection';

import type { PollingComponentProps } from './types';
import { WaitingIndicator } from './WaitingIndicator';

export function PollingComponent({
  authenticationStartResponse,
  onComplete,
  onError,
}: PollingComponentProps) {
  const { t } = useTranslation();

  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { redirect_url, state } = authenticationStartResponse;
        window.Actual.openURLInBrowser(redirect_url);
        const { data, error } = await send('enablebanking-pollauth', { state });

        if (cancelled) return;

        if (error) {
          onErrorRef.current(error);
          return;
        }
        if (!data) {
          onErrorRef.current({
            error_code: 'INTERNAL_ERROR',
            error_type: 'No data returned from enablebanking-pollauth',
          });
          return;
        }

        onCompleteRef.current(data);
      } catch (err) {
        if (cancelled) return;
        onErrorRef.current({
          error_code: 'INTERNAL_ERROR',
          error_type: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticationStartResponse]);

  return (
    <WaitingIndicator
      message={t('Please complete the authentication in the opened window.')}
    />
  );
}
