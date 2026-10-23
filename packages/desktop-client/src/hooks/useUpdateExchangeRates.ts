import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';

import { getErrorMessage } from '#components/currency/ExchangeRatesTable';
import {
  addNotification,
  removeNotification,
} from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

const PROGRESS_NOTIFICATION_ID = 'exchange-rates-updating';

// Fetches the missing exchange rates now and tells the user how it went,
// optionally showing that it's under way first
export function useUpdateExchangeRates() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return async ({ showProgress = false }: { showProgress?: boolean } = {}) => {
    if (showProgress) {
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
    }

    let error: string | null = null;
    let added = 0;
    try {
      const status = await send('exchange-rates-update');
      added = status.added;
      error = status.errors.length > 0 ? status.errors.join('; ') : null;
    } catch (err) {
      error = getErrorMessage(err) ?? t('Something went wrong.');
    }

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
  };
}
