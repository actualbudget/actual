import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { OperationRate } from '@actual-app/core/types/models';

import { RateField, storedRate } from '#components/transactions/RateField';
import type { RateDirection } from '#components/transactions/RateField';

type MissingRateFormProps = {
  /** Dates (YYYY-MM-DD, sorted) that need a rate. */
  dates: string[];
  currencyCode: string;
  onSubmit: (rates: OperationRate[]) => void;
};

/**
 * Asks for the rate one operation needs on each listed day. The rate goes
 * with that operation only; it is never saved as a daily rate.
 */
export function MissingRateForm({
  dates,
  currencyCode,
  onSubmit,
}: MissingRateFormProps) {
  const { t } = useTranslation();
  const [rate, setRate] = useState('');
  const [direction, setDirection] = useState<RateDirection>('base-per-foreign');
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    let stored: string;
    try {
      stored = storedRate(rate, direction);
    } catch {
      setMessage(t('Enter a valid rate.'));
      return;
    }
    setMessage(null);
    onSubmit(
      dates.map(date => ({ date, quoteCurrency: currencyCode, rate: stored })),
    );
  }

  return (
    <View style={{ gap: 6, marginBottom: 15 }}>
      <Text style={{ color: theme.warningText }}>
        <Trans>
          No exchange rate is available for {{ dates: dates.join(', ') }}. Enter
          a rate to use for these days in this operation only.
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
          isDisabled={rate.trim() === ''}
          onPress={submit}
        >
          <Trans>Use rate</Trans>
        </Button>
      </View>
      {message && <Text style={{ color: theme.errorText }}>{message}</Text>}
    </View>
  );
}
