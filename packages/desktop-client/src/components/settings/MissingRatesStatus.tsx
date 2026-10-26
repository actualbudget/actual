import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { SettingsRow } from './SettingsRow';

/** Get missing rates fills every missing daily rate of account history. */
export function MissingRatesStatus() {
  const { t } = useTranslation();

  return (
    <SettingsRow
      title={t('Fetched rates')}
      description={t(
        'Daily rates come from the public exchange-api mirrors on jsDelivr and Cloudflare. They receive the currency codes, the dates and your IP address. No sync server is needed.',
      )}
      control={
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button
            onPress={() => {
              void send('exchange-rates/missing-start', { reason: 'manual' });
            }}
          >
            <Trans>Get missing rates</Trans>
          </Button>
        </View>
      }
    />
  );
}
