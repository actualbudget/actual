import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { Handlers } from '@actual-app/core/types/handlers';

import { useDateFormat } from '#hooks/useDateFormat';
import { useExchangeRates } from '#hooks/useExchangeRates';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { updateExchangeRates } from '#hooks/useUpdateExchangeRates';

import { describeMissingRates } from './missingRates';
import type { MissingExchangeRates } from './missingRates';

type UpdateStatus = Awaited<ReturnType<Handlers['exchange-rates-update']>>;

// Fetches the missing rates now, and shows how the last update on this
// device went and which rates are still missing
export function RatesUpdate() {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [autoUpdatePref] = useSyncedPref('exchange-rates-auto-update');
  // Checked again whenever rates change, e.g. after an edit or an update
  const { exchangeRates, isLoading } = useExchangeRates();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [missing, setMissing] = useState<MissingExchangeRates[]>([]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    let isCurrent = true;
    send('exchange-rates-update-status')
      .then(saved => {
        if (isCurrent) {
          setStatus(saved);
        }
      })
      // Without it, the page explains how rates are updated instead
      .catch(() => null);
    send('exchange-rates-missing')
      .then(missingRates => {
        if (isCurrent) {
          setMissing(missingRates);
        }
      })
      // The warnings stay as they were until the next change
      .catch(() => null);
    return () => {
      isCurrent = false;
    };
  }, [exchangeRates, isLoading]);

  const onUpdate = async () => {
    setIsUpdating(true);
    setStatus(await updateExchangeRates(t('Something went wrong.')));
    setIsUpdating(false);
  };

  // The day of the update where the user is, not in UTC
  const updatedOn = status
    ? monthUtils.format(
        monthUtils.dayFromDate(new Date(status.time)),
        dateFormat,
      )
    : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <Button isDisabled={isUpdating} onPress={() => void onUpdate()}>
        {isUpdating ? t('Updating…') : t('Get missing rates from Frankfurter')}
      </Button>
      <View style={{ flex: 1, minWidth: 200, lineHeight: 1.5 }}>
        {describeMissingRates(
          // Currencies without any rate are already listed above
          missing.filter(rates => rates.outdatedSince || !rates.isOutdated),
          t,
          dateFormat,
        ).map(sentence => (
          <Text key={sentence} style={{ color: theme.warningText }}>
            {sentence}
          </Text>
        ))}
        {status ? (
          <>
            {status.added > 0 ? (
              <Text style={{ color: theme.pageTextLight }}>
                {t('Last updated on {{date}}: {{count}} new rates.', {
                  date: updatedOn,
                  count: status.added,
                })}
              </Text>
            ) : (
              status.errors.length === 0 && (
                <Text style={{ color: theme.pageTextLight }}>
                  {t('Up to date as of {{date}}.', { date: updatedOn })}
                </Text>
              )
            )}
            {status.unsupported.length > 0 && (
              <Text style={{ color: theme.warningText }}>
                {t('Frankfurter has no rates for {{currencies}}.', {
                  currencies: status.unsupported.join(', '),
                })}
              </Text>
            )}
            {status.errors.map(error => (
              <Text key={error} style={{ color: theme.errorText }}>
                {t('Could not update: {{error}}', { error })}
              </Text>
            ))}
          </>
        ) : (
          <Text style={{ color: theme.pageTextLight }}>
            {autoUpdatePref === 'true'
              ? t('Rates are updated automatically once a day.')
              : t(
                  'Fetches the rates your accounts are missing, adding a pair for any currency that has none, or turn on automatic updates in Settings.',
                )}
          </Text>
        )}
      </View>
    </View>
  );
}
