import { queryOptions } from '@tanstack/react-query';

import { q } from 'loot-core/shared/query';
import type { Query } from 'loot-core/shared/query';
import {
  getHasTransactionsQuery,
  getStatus,
  getStatusLabel,
} from 'loot-core/shared/schedules';
import type {
  ScheduleStatusLabelLookup,
  ScheduleStatusLookup,
} from 'loot-core/shared/schedules';
import type {
  AccountEntity,
  ScheduleEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import { accountFilter } from '@desktop-client/queries';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export type ScheduleData = ScheduleStatusData & {
  schedules: readonly ScheduleEntity[];
};

export type ScheduleStatusData = {
  statusLookup: ScheduleStatusLookup;
  statusLabelLookup: ScheduleStatusLabelLookup;
};

type AqlOptions = {
  query?: Query;
};

export const scheduleQueries = {
  all: () => ['schedules'],
  aql: ({ query }: AqlOptions) =>
    queryOptions<ScheduleEntity[]>({
      queryKey: [...scheduleQueries.all(), 'aql', query],
      queryFn: async () => {
        if (!query) {
          // Shouldn't happen because of the enabled flag, but needed to satisfy TS
          throw new Error('No query provided.');
        }
        const { data: schedules }: { data: ScheduleEntity[] } =
          await aqlQuery(query);

        return schedules;
      },
      enabled: !!query,
      placeholderData: [],
    }),
  statuses: ({
    schedules,
    upcomingLength,
  }: {
    schedules: readonly ScheduleEntity[];
    upcomingLength: string;
  }) =>
    queryOptions<ScheduleStatusData>({
      queryKey: [
        ...scheduleQueries.all(),
        'statuses',
        { schedules, upcomingLength },
      ],
      queryFn: async () => {
        const { data: transactions }: { data: TransactionEntity[] } =
          await aqlQuery(getHasTransactionsQuery(schedules));

        const schedulesWithTransactions = new Set(
          transactions.filter(Boolean).map(trans => trans.schedule),
        );

        const statusLookup: ScheduleStatusLookup = Object.fromEntries(
          schedules.map(s => [
            s.id,
            getStatus(
              s.next_date,
              s.completed,
              schedulesWithTransactions.has(s.id),
              upcomingLength,
            ),
          ]),
        );

        const statusLabelLookup: ScheduleStatusLabelLookup = Object.fromEntries(
          Object.keys(statusLookup).map(key => [
            key,
            getStatusLabel(statusLookup[key] || ''),
          ]),
        );

        return { statusLookup, statusLabelLookup };
      },
      enabled: schedules.length > 0,
      placeholderData: { statusLookup: {}, statusLabelLookup: {} },
    }),
};

export function schedulesViewQuery(
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
