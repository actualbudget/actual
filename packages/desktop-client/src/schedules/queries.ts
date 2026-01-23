import { queryOptions } from '@tanstack/react-query';

import type { Query } from 'loot-core/shared/query';
import {
  getHasTransactionsQuery,
  getStatus,
  getStatusLabel,
} from 'loot-core/shared/schedules';
import type {
  ScheduleStatusLabelMap,
  ScheduleStatusMap,
} from 'loot-core/shared/schedules';
import type { ScheduleEntity, TransactionEntity } from 'loot-core/types/models';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export type ScheduleData = ScheduleStatusData & {
  schedules: readonly ScheduleEntity[];
};

export type ScheduleStatusData = {
  scheduleStatusMap: ScheduleStatusMap;
  scheduleStatusLabelMap: ScheduleStatusLabelMap;
};

type AqlOptions = {
  query?: Query;
  statusOptions?: {
    enabled: boolean;
    upcomingLength: string;
  };
};

export const scheduleQueries = {
  all: () => ['schedules'],
  lists: () => [...scheduleQueries.all(), 'lists'],
  aql: ({ query, statusOptions }: AqlOptions) =>
    queryOptions<ScheduleData>({
      queryKey: [...scheduleQueries.lists(), query],
      queryFn: async ({ client }) => {
        if (!query) {
          // Shouldn't happen because of the enabled flag, but needed to satisfy TS
          throw new Error('No query provided.');
        }
        const { data: schedules }: { data: ScheduleEntity[] } =
          await aqlQuery(query);

        if (statusOptions?.enabled) {
          const statuses = await client.ensureQueryData(
            scheduleQueries.statuses({
              schedules,
              upcomingLength: statusOptions.upcomingLength,
            }),
          );
          return {
            schedules,
            scheduleStatusMap: statuses.scheduleStatusMap,
            scheduleStatusLabelMap: statuses.scheduleStatusLabelMap,
          };
        }

        return {
          schedules,
          scheduleStatusMap: new Map(),
          scheduleStatusLabelMap: new Map(),
        };
      },
      enabled: !!query,
      placeholderData: {
        schedules: [],
        scheduleStatusMap: new Map(),
        scheduleStatusLabelMap: new Map(),
      },
    }),
  statuses: ({
    schedules,
    upcomingLength,
  }: {
    schedules: readonly ScheduleEntity[];
    upcomingLength: string;
  }) =>
    queryOptions<ScheduleStatusData>({
      queryKey: [...scheduleQueries.lists(), 'statuses', schedules],
      queryFn: async () => {
        const { data: transactions }: { data: TransactionEntity[] } =
          await aqlQuery(getHasTransactionsQuery(schedules));

        const schedulesWithTransactions = new Set(
          transactions.filter(Boolean).map(trans => trans.schedule),
        );

        const scheduleStatusMap: ScheduleStatusMap = new Map(
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

        const scheduleStatusLabelMap: ScheduleStatusLabelMap = new Map(
          [...scheduleStatusMap.keys()].map(key => [
            key,
            getStatusLabel(scheduleStatusMap.get(key) || ''),
          ]),
        );

        return { scheduleStatusMap, scheduleStatusLabelMap };
      },
      enabled: schedules.length > 0,
    }),
};
