import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { q } from 'loot-core/shared/query';
import type { Query } from 'loot-core/shared/query';
import type { AccountEntity } from 'loot-core/types/models';

import { useSyncedPref } from './useSyncedPref';

import { accountFilter } from '@desktop-client/queries';
import { scheduleQueries } from '@desktop-client/schedules';
import type { ScheduleData } from '@desktop-client/schedules';

export type UseSchedulesProps = {
  query?: Query;
};
export type UseSchedulesResult = UseQueryResult<ScheduleData>;

export function useSchedules({
  query,
}: UseSchedulesProps = {}): UseSchedulesResult {
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');
  return useQuery(
    scheduleQueries.aql({
      query,
      statusOptions: { enabled: true, upcomingLength },
    }),
  );
}

export function getSchedulesQuery(
  view?: AccountEntity['id'] | 'onbudget' | 'offbudget' | 'uncategorized',
) {
  const filterByAccount = accountFilter(view, '_account');
  const filterByPayee = accountFilter(view, '_payee.transfer_acct');

  let query = q('schedules')
    .select('*')
    .filter({
      $and: [{ '_account.closed': false }],
    });

  if (view) {
    if (view === 'uncategorized') {
      query = query.filter({ next_date: null });
    } else {
      query = query.filter({
        $or: [filterByAccount, filterByPayee],
      });
    }
  }

  return query.orderBy({ next_date: 'desc' });
}
