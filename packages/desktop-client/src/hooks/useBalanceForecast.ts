import { useEffect, useEffectEvent } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
  ForecastResult,
  ForecastSource,
} from '@actual-app/core/types/models/forecast';
import type { ServerEvents } from '@actual-app/core/types/server-events';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

type UseBalanceForecastParams = {
  accountIds?: string[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  includeAccountlessSchedules?: boolean;
  source?: ForecastSource;
  missedSchedules?: ForecastMissedSchedules;
  missedOccurrences?: ForecastMissedOccurrences;
  enabled?: boolean;
};

export function buildBalanceForecastRequest({
  accountIds,
  conditions,
  conditionsOp,
  startDate,
  endDate,
  includeAccountlessSchedules,
  source = 'schedules',
  missedSchedules,
  missedOccurrences,
}: UseBalanceForecastParams) {
  return Object.fromEntries(
    Object.entries({
      accountIds,
      conditions,
      conditionsOp,
      startDate,
      endDate,
      includeAccountlessSchedules,
      source,
      missedSchedules,
      missedOccurrences,
    }).filter(([, value]) => value !== undefined),
  );
}

export function useBalanceForecast({
  accountIds,
  conditions,
  conditionsOp,
  startDate,
  endDate,
  includeAccountlessSchedules,
  source = 'schedules',
  missedSchedules,
  missedOccurrences,
  enabled = true,
}: UseBalanceForecastParams) {
  const result = useQuery({
    queryKey: [
      'balance-forecast',
      {
        accountIds: accountIds ?? null,
        conditions: conditions ?? null,
        conditionsOp: conditionsOp ?? 'and',
        startDate,
        endDate,
        includeAccountlessSchedules: includeAccountlessSchedules ?? false,
        source,
        missedSchedules: missedSchedules ?? 'exclude',
        missedOccurrences: missedOccurrences ?? 'one',
      },
    ],
    queryFn: async (): Promise<ForecastResult> =>
      send(
        'forecast/generate',
        buildBalanceForecastRequest({
          accountIds,
          conditions,
          conditionsOp,
          startDate,
          endDate,
          includeAccountlessSchedules,
          source,
          missedSchedules,
          missedOccurrences,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled,
  });

  const onSyncEvent = useEffectEvent((event: ServerEvents['sync-event']) => {
    if (
      enabled &&
      (event.type === 'applied' || event.type === 'success') &&
      event.tables.some(table =>
        [
          'transactions',
          'schedules',
          'schedules_next_date',
          'rules',
          'accounts',
          'payees',
          'payee_mapping',
          'categories',
          'category_mapping',
        ].includes(table),
      )
    ) {
      void result.refetch();
    }
  });
  useEffect(() => listen('sync-event', onSyncEvent), []);

  return result;
}
