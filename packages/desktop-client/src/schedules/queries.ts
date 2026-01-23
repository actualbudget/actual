import { queryOptions } from '@tanstack/react-query';

import type { Query } from 'loot-core/shared/query';
import {
  getHasTransactionsQuery,
  getStatus,
  getStatusLabel,
} from 'loot-core/shared/schedules';
import type { ScheduleEntity, TransactionEntity } from 'loot-core/types/models';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export type ScheduleStatusType = ReturnType<typeof getStatus>;
export type ScheduleStatuses = Map<ScheduleEntity['id'], ScheduleStatusType>;

export type ScheduleStatusLabelType = ReturnType<typeof getStatusLabel>;
export type ScheduleStatusLabels = Map<
  ScheduleEntity['id'],
  ScheduleStatusLabelType
>;

export type ScheduleData = ScheduleStatusData & {
  schedules: readonly ScheduleEntity[];
};

export type ScheduleStatusData = {
  statuses: ScheduleStatuses;
  labels: ScheduleStatusLabels;
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
            statuses: statuses.statuses,
            labels: statuses.labels,
          };
        }

        return {
          schedules,
          statuses: new Map(),
          labels: new Map(),
        };
      },
      enabled: !!query,
      placeholderData: {
        schedules: [],
        statuses: new Map(),
        labels: new Map(),
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

        const statuses: ScheduleStatuses = new Map(
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

        const labels: ScheduleStatusLabels = new Map(
          [...statuses.keys()].map(key => [
            key,
            getStatusLabel(statuses.get(key) || ''),
          ]),
        );

        return { statuses, labels };
      },
      enabled: schedules.length > 0,
    }),
};
