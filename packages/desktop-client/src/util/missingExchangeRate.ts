import type { MissingExchangeRateMeta } from '@actual-app/core/server/currencies/app';
import type { TFunction } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import type { AppDispatch } from '#redux/store';

export type MissingExchangeRate = MissingExchangeRateMeta;

export function getMissingExchangeRate(error: unknown) {
  if (typeof error !== 'object' || error == null) {
    return null;
  }

  const maybeError = error as {
    type?: string;
    meta?: Partial<MissingExchangeRate>;
    missingExchangeRate?: Partial<MissingExchangeRate>;
    message?: string;
  };

  const meta =
    maybeError.missingExchangeRate ||
    (maybeError.type === 'MissingExchangeRateError' ? maybeError.meta : null);

  if (
    meta &&
    typeof meta.fromCurrency === 'string' &&
    typeof meta.toCurrency === 'string' &&
    typeof meta.date === 'string'
  ) {
    return {
      fromCurrency: meta.fromCurrency,
      toCurrency: meta.toCurrency,
      date: meta.date,
    };
  }

  const match = maybeError.message?.match(
    /Missing exchange rate (?:from|for) ([A-Z]{3}) to ([A-Z]{3}) on or before ([0-9]{4}-[0-9]{2}-[0-9]{2})/,
  );

  if (match) {
    return {
      fromCurrency: match[1],
      toCurrency: match[2],
      date: match[3],
    };
  }

  return null;
}

export function openMissingExchangeRateModal({
  dispatch,
  t,
  missingRate,
  onSaved,
}: {
  dispatch: AppDispatch;
  t: TFunction;
  missingRate: MissingExchangeRate;
  onSaved?: () => void | Promise<void>;
}) {
  dispatch(
    pushModal({
      modal: {
        name: 'exchange-rate',
        options: {
          ...missingRate,
          onSaved,
          onCancel: () =>
            showMissingExchangeRateNotification({
              dispatch,
              t,
              missingRate,
              onSaved,
            }),
        },
      },
    }),
  );
}

export function showMissingExchangeRateNotification({
  dispatch,
  t,
  missingRate,
  onSaved,
}: {
  dispatch: AppDispatch;
  t: TFunction;
  missingRate: MissingExchangeRate;
  onSaved?: () => void | Promise<void>;
}) {
  dispatch(
    addNotification({
      notification: {
        id: uuidv4(),
        type: 'error',
        sticky: true,
        message: t(
          'Exchange rate is missing for this transaction. The transaction cannot be saved.',
        ),
        pre: t('{{fromCurrency}} to {{toCurrency}} on or before {{date}}', {
          fromCurrency: missingRate.fromCurrency,
          toCurrency: missingRate.toCurrency,
          date: missingRate.date,
        }),
        button: {
          title: t('Add exchange rate'),
          action: () =>
            openMissingExchangeRateModal({
              dispatch,
              t,
              missingRate,
              onSaved,
            }),
        },
      },
    }),
  );
}
