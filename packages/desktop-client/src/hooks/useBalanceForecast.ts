import { send } from '@actual-app/core/platform/client/connection';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import type {
  ForecastAssumptions,
  ForecastResult,
  ForecastSource,
} from '@actual-app/core/types/models/forecast';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

type UseBalanceForecastParams = {
  accountIds?: string[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  includeAccountlessSchedules?: boolean;
  source?: ForecastSource;
  assumptions?: ForecastAssumptions;
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
  assumptions,
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
      assumptions,
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
  assumptions,
  enabled = true,
}: UseBalanceForecastParams) {
  return useQuery({
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
        assumptions: assumptions ?? null,
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
          assumptions,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}
