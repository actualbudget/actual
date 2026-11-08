import { send } from '@actual-app/core/platform/client/connection';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import type { AppDispatch } from '#redux/store';

/**
 * Posts an occurrence with saved rates, fetching missing rates when a provider
 * is available. Manual conversion keeps the draft available if no rate resolves.
 */
export async function postScheduleTransaction(
  dispatch: AppDispatch,
  id: ScheduleEntity['id'],
  today?: boolean,
) {
  let result = await send('schedule/post-transaction', { id, today });
  if (
    result?.type === 'rate-unavailable' ||
    result?.type === 'exchange-unavailable'
  ) {
    try {
      const status = await send('exchange-rates/provider-status');
      if (status.status === 'superseded') return;
      if (status.status === 'ok' && status.selected) {
        const currencies =
          result.type === 'rate-unavailable'
            ? [result.currency]
            : result.currencies;
        const date =
          result.type === 'rate-unavailable'
            ? result.transaction.date
            : result.date;
        const rates = await Promise.all(
          currencies.map(quoteCurrency =>
            send('exchange-rates/ensure', {
              quoteCurrency,
              date,
              forEntry: result?.type === 'rate-unavailable',
            }),
          ),
        );
        if (
          rates.some(
            rate => rate.status === 'superseded' || rate.status === 'stopped',
          )
        ) {
          return;
        }
        if (
          rates.every(
            rate =>
              'resolution' in rate && rate.resolution.status === 'resolved',
          )
        ) {
          result = await send('schedule/post-transaction', { id, today });
        }
      }
    } catch {
      // The original missing-rate draft remains available for manual completion.
    }
  }
  if (result?.type === 'exchange-unavailable') {
    dispatch(
      pushModal({
        modal: {
          name: 'exchange-transfer',
          options: {
            occurrence: {
              schedule: result.schedule,
              account: result.account,
              other: result.other,
              date: result.date,
              amount: result.amount,
              notes: result.notes,
              cleared: result.cleared,
              category: result.category,
            },
          },
        },
      }),
    );
  } else if (result?.type === 'rate-unavailable') {
    dispatch(
      pushModal({
        modal: {
          name: 'foreign-amount',
          options: {
            transaction: result.transaction,
            currencyCode: result.currency,
            nativePrecision: result.precision,
            // The draft already carries its rule results.
            rulesApplied: true,
            onPosted: () => null,
          },
        },
      }),
    );
  }
}

export function usePostScheduleTransaction() {
  const dispatch = useDispatch();
  return (id: ScheduleEntity['id'], today?: boolean) =>
    postScheduleTransaction(dispatch, id, today);
}
