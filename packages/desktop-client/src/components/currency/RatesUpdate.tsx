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

import { getErrorMessage } from './ExchangeRatesTable';

type UpdateStatus = Awaited<ReturnType<Handlers['exchange-rates-update']>>;

// Fetches the missing rates now, and shows how the last update on this
// device went
export function RatesUpdate() {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [autoUpdatePref] = useSyncedPref('exchange-rates-auto-update');
  // Checked again whenever rates change, e.g. after an edit or an update
  const { exchangeRates, isLoading } = useExchangeRates();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
    return () => {
      isCurrent = false;
    };
  }, [exchangeRates, isLoading]);

  const onUpdate = async () => {
    setIsUpdating(true);
    try {
      setStatus(await send('exchange-rates-update'));
    } catch (err) {
      setStatus({
        added: 0,
        updated: 0,
        unchanged: 0,
        unsupported: [],
        errors: [getErrorMessage(err) ?? t('Something went wrong.')],
        time: new Date().toISOString(),
      });
    } finally {
      setIsUpdating(false);
    }
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
