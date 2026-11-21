import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import i18n from 'i18next';

import { getErrorMessage } from '#components/currency/errors';
import {
  addNotification,
  removeNotification,
} from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

const PROGRESS_NOTIFICATION_ID = 'exchange-rates-updating';

export type ExchangeRatesUpdateOutcome = Awaited<
  ReturnType<typeof send<'exchange-rates-update'>>
>;

// Fetches the missing exchange rates now. A request that fails outright
// is reported like an update with an error, so callers show both the same
// way.
export async function updateExchangeRates(): Promise<ExchangeRatesUpdateOutcome> {
  try {
    return await send('exchange-rates-update');
  } catch (err) {
    return {
      added: 0,
      updated: 0,
      unchanged: 0,
      unsupported: [],
      errors: [getErrorMessage(err) ?? i18n.t('Something went wrong.')],
      time: new Date().toISOString(),
    };
  }
}

// Fetches the missing exchange rates now, showing that it's under way, and
// tells the user how it went. The function keeps its identity across
// renders, as effects depend on it.
export function useUpdateExchangeRates() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return useCallback(async () => {
    dispatch(
      addNotification({
        notification: {
          id: PROGRESS_NOTIFICATION_ID,
          type: 'message',
          sticky: true,
          message: t('Getting exchange rates from Frankfurter…'),
        },
      }),
    );

    const status = await updateExchangeRates();
    const error = status.errors.length > 0 ? status.errors.join('; ') : null;
    const { added } = status;

    dispatch(removeNotification({ id: PROGRESS_NOTIFICATION_ID }));
    dispatch(
      addNotification({
        notification:
          error !== null
            ? {
                type: 'error',
                message: t('Could not update exchange rates: {{error}}', {
                  error,
                }),
              }
            : {
                type: 'message',
                message: t('Exchange rates updated: {{count}} new rates.', {
                  count: added,
                }),
              },
      }),
    );
  }, [dispatch, t]);
}
