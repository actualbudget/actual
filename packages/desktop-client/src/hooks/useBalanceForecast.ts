import { send } from '@actual-app/core/platform/client/connection';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import type {
  ForecastSeries,
  ForecastSource,
} from '@actual-app/core/types/models/forecast';
import { useQuery } from '@tanstack/react-query';

type UseBalanceForecastParams = {
  accountIds?: string[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  includeAccountlessSchedules?: boolean;
  source?: ForecastSource;
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
    }).filter(([, value]) => value !== undefined),
  );
}

export function useBalanceForecastSeries({
  series,
  enabled = true,
  ...params
}: UseBalanceForecastParams & { series?: ForecastSeries[] }) {
  const requests = buildBalanceForecastSeriesRequests(series, params);

  return useQuery({
    queryKey: ['balance-forecast-series', requests],
    queryFn: () =>
      Promise.all(
        requests.map(async ({ id, request }) => ({
          id,
          forecast: await send('forecast/generate', request),
        })),
      ),
    // Keep the whole comparison visible while its dates or filters change.
    // Drop previous results when line IDs or their order change.
    placeholderData: (previous, previousQuery) => {
      const previousRequests = previousQuery?.queryKey[1];
      if (!Array.isArray(previousRequests)) {
        return undefined;
      }
      return requests.length === previousRequests.length &&
        requests.every(({ id }, index) => id === previousRequests[index].id)
        ? previous
        : undefined;
    },
    enabled,
  });
}

export function buildBalanceForecastSeriesRequests(
  series: ForecastSeries[] | undefined,
  params: UseBalanceForecastParams,
) {
  if (!series?.length || params.source === 'tracking-budget') {
    return [{ id: 'balance', request: buildBalanceForecastRequest(params) }];
  }

  return series.map(line => ({
    id: line.id,
    request: buildBalanceForecastRequest({
      ...params,
      accountIds: line.accounts,
      conditions: line.conditions,
      conditionsOp: line.conditionsOp,
      includeAccountlessSchedules: line.accounts === undefined,
    }),
  }));
}
