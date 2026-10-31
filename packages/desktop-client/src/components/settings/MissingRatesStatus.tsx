import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { listen, send } from '@actual-app/core/platform/client/connection';
import type { MissingRatesProgress } from '@actual-app/core/types/models/exchange-rate-history';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import type { FxProviderContext } from '#hooks/useFxProviderContext';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { SettingsRow } from './SettingsRow';

function statusText(
  progress: MissingRatesProgress,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  switch (progress.state) {
    case 'running':
      return t('Updating exchange rates…');
    case 'paused':
      return t('Waiting for the rate provider until {{time}}.', {
        time: new Date(progress.retryAt ?? Date.now()).toLocaleTimeString(),
      });
    case 'done':
      return t(
        'Exchange rates updated: {{added}} added, {{missing}} not published, {{errors}} failed.',
        progress,
      );
    default:
      return t('Exchange rate update stopped.');
  }
}

/** The automation setting, Get missing rates and one compact status line. */
export function MissingRatesStatus({ fx }: { fx: FxProviderContext }) {
  const { t } = useTranslation();
  const [autoUpdate, setAutoUpdate] = useSyncedPref(
    'exchange-rates-auto-update',
  );
  const [progress, setProgress] = useState<MissingRatesProgress | null>(null);
  const context = fx.context;

  useEffect(() => {
    let cancelled = false;
    setProgress(null);
    void send('exchange-rates/missing-status').then(status => {
      if (!cancelled && status && status.context === context) {
        setProgress(status);
      }
    });
    const unlisten = listen('exchange-rates-update', event => {
      if (event.context === context) setProgress(event);
    });
    return () => {
      cancelled = true;
      unlisten();
    };
  }, [context]);

  const active = progress?.state === 'running' || progress?.state === 'paused';

  return (
    <SettingsRow
      title={t('Fetched rates')}
      description={t(
        'Daily rates come from the public exchange-api mirrors on jsDelivr and Cloudflare. They receive the currency codes, the dates and your IP address. No sync server is needed.',
      )}
      control={
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button
            isDisabled={active}
            onPress={() => {
              void send('exchange-rates/missing-start', { reason: 'manual' });
            }}
          >
            <Trans>Get missing rates</Trans>
          </Button>
        </View>
      }
    >
      <LabeledCheckbox
        id="exchange-rates-auto-update"
        checked={autoUpdate !== 'false'}
        onChange={event =>
          setAutoUpdate(event.currentTarget.checked ? 'true' : 'false')
        }
      >
        <Trans>Fetch missing daily rates automatically</Trans>
      </LabeledCheckbox>
      <View
        data-testid="exchange-rates-update-status"
        aria-live="polite"
        style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
      >
        {progress && (
          <Text style={styles.smallText}>{statusText(progress, t)}</Text>
        )}
        {active && progress && (
          <Button
            variant="bare"
            onPress={() => {
              void send('exchange-rates/missing-stop', {
                runId: progress.runId,
              });
            }}
          >
            <Trans>Stop</Trans>
          </Button>
        )}
      </View>
    </SettingsRow>
  );
}
