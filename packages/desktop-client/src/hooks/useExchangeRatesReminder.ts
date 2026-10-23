import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';

import { describeMissingRates } from '#components/currency/missingRates';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { useDateFormat } from './useDateFormat';
import { useLocalPref } from './useLocalPref';
import { useMultiCurrency } from './useMultiCurrency';
import { useUpdateExchangeRates } from './useUpdateExchangeRates';

const NOTIFICATION_ID = 'exchange-rates-missing';

// Gives the budget's first sync, which also runs the day's automatic
// update, time to finish before checking
const CHECK_DELAY_MS = 5000;

/**
 * Reminds the user, at most once a day, when currencies in use are missing
 * exchange rates: rates that stop before yesterday, transactions older than
 * the first rate, or fetched rates missing in between. With automatic
 * updates on, only when the last one failed or the provider has no rates
 * for a currency, since the rates otherwise fill themselves in.
 */
export function useExchangeRatesReminder() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isEnabled } = useMultiCurrency();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [lastReminder, setLastReminder] = useLocalPref(
    'exchangeRates.lastReminder',
  );
  const updateRates = useUpdateExchangeRates();

  useEffect(() => {
    const today = monthUtils.currentDay();
    if (!isEnabled || lastReminder === today) {
      return;
    }

    let isCurrent = true;
    const remind = async () => {
      // On failure the reminder is tried again the next time the budget
      // opens
      const check = await send('exchange-rates-check').catch(() => undefined);
      if (!isCurrent || check === undefined) {
        return;
      }
      setLastReminder(today);
      if (!check) {
        return;
      }

      const details = describeMissingRates(check.missing, t, dateFormat);
      if (check.unsupported.length > 0) {
        details.push(
          t('Frankfurter has no rates for {{currencies}}.', {
            currencies: check.unsupported.join(', '),
          }),
        );
      }
      if (check.errors.length > 0) {
        details.push(
          t('The last automatic update failed: {{error}}', {
            error: check.errors.join('; '),
          }),
        );
      }
      dispatch(
        addNotification({
          notification: {
            id: NOTIFICATION_ID,
            type: 'warning',
            sticky: true,
            title: t('Exchange rates are missing'),
            message: details.join(' '),
            button: {
              title: t('Update now'),
              action: () => updateRates({ showProgress: true }),
            },
          },
        }),
      );
    };

    const timer = setTimeout(() => void remind(), CHECK_DELAY_MS);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [
    dateFormat,
    dispatch,
    isEnabled,
    lastReminder,
    setLastReminder,
    t,
    updateRates,
  ]);
}
