import { send } from '@actual-app/core/platform/client/connection';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import type { ForecastResult } from '@actual-app/core/types/models/forecast';

type UseBalanceForecastParams = {
  accountIds?: string[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  includeAccountlessSchedules?: boolean;
  enabled?: boolean;
};

export function useBalanceForecast({
  accountIds,
  conditions,
  conditionsOp,
  startDate,
  endDate,
  includeAccountlessSchedules,
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
      },
    ],
    queryFn: async (): Promise<ForecastResult> =>
      send('forecast/generate', {
        accountIds,
        conditions,
        conditionsOp,
        startDate,
        endDate,
        includeAccountlessSchedules,
      }),
    placeholderData: keepPreviousData,
    enabled,
  });
}
