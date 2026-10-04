import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { RateField, storedRate } from '#components/transactions/RateField';
import type { RateDirection } from '#components/transactions/RateField';

type MissingRateFormProps = {
  /** Dates (YYYY-MM-DD, sorted) that need a rate. */
  dates: string[];
  currencyCode: string;
  onSaved: () => void;
};

/**
 * Saves a standing rate from the earliest date an import needs, so the
 * import can convert its amounts. Rate management UI comes later.
 */
export function MissingRateForm({
  dates,
  currencyCode,
  onSaved,
}: MissingRateFormProps) {
  const { t } = useTranslation();
  const [rate, setRate] = useState('');
  const [direction, setDirection] = useState<RateDirection>('foreign-per-base');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const from = dates[0];

  async function save() {
    setBusy(true);
    try {
      const result = await send('exchange-rates/save', {
        quoteCurrency: currencyCode,
        rate: storedRate(rate, direction),
        kind: 'standing',
        date: from,
      });
      if (result.status === 'saved') {
        setMessage(null);
        onSaved();
      } else {
        setMessage(t('A rate is already saved for {{date}}.', { date: from }));
      }
    } catch {
      setMessage(t('Enter a valid rate.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 6, marginBottom: 15 }}>
      <Text style={{ color: theme.warningText }}>
        <Trans>
          No exchange rate is saved for {{ dates: dates.join(', ') }}. Enter a
          rate, used from {{ from }} until you save another rate.
        </Trans>
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <RateField
          name="importRate"
          currencyCode={currencyCode}
          value={rate}
          placeholder={t('Rate')}
          direction={direction}
          onChange={(value, nextDirection) => {
            setRate(value);
            setDirection(nextDirection);
          }}
        />
        <Button
          variant="primary"
          isDisabled={busy || rate.trim() === ''}
          onPress={() => void save()}
        >
          <Trans>Save rate</Trans>
        </Button>
      </View>
      {message && <Text style={{ color: theme.errorText }}>{message}</Text>}
    </View>
  );
}
