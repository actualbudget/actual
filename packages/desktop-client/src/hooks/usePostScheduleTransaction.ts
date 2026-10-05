import { send } from '@actual-app/core/platform/client/connection';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import type { AppDispatch } from '#redux/store';

/**
 * Posts a schedule's occurrence. A foreign schedule without a saved rate
 * opens the conversion dialog with the draft, so the user can enter a rate
 * or base amount; nothing is posted until then.
 */
export async function postScheduleTransaction(
  dispatch: AppDispatch,
  id: ScheduleEntity['id'],
  today?: boolean,
) {
  const result = await send('schedule/post-transaction', { id, today });
  if (result?.type === 'rate-unavailable') {
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
