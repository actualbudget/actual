import { createApp } from '#server/app';
import * as db from '#server/db';
import type { RuleConditionEntity } from '#types/models';
import type { ForecastResult } from '#types/models/forecast';

import { resolveForecastAccounts } from './forecast-accounts';
import { buildFilterInfo, getTransactions } from './forecast-filters';
import {
  buildForecastDateContext,
  createEmptyForecastResult,
  projectForecastData,
} from './forecast-projection';
import {
  buildFutureScheduleOccurrences,
  getNormalizedSchedules,
} from './forecast-schedules';

export type ForecastRequestParams = {
  accountIds?: string[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate?: string;
  endDate?: string;
};

export async function generateForecast({
  accountIds,
  conditions,
  conditionsOp,
  startDate,
  endDate,
}: ForecastRequestParams): Promise<ForecastResult> {
  const dateContext = buildForecastDateContext(startDate, endDate);
  const { filterInfo, plainConditions, resolvedConditionsOp } = buildFilterInfo(
    conditions,
    conditionsOp,
  );
  const accounts = await resolveForecastAccounts({
    accountIds,
    plainConditions,
    resolvedConditionsOp,
    canRestrictAccounts: filterInfo.canRestrictAccounts,
  });

  if (accounts.length === 0) {
    return createEmptyForecastResult(
      dateContext.forecastStartDate,
      dateContext.forecastEndDate,
    );
  }

  const accountIdsToQuery = accounts.map(account => account.id);
  const accountsById = new Map(accounts.map(account => [account.id, account]));
  const [schedules, transactions, ruleAccounts] = await Promise.all([
    getNormalizedSchedules(),
    getTransactions(accountIdsToQuery, filterInfo),
    db.getAccounts(),
  ]);
  const futureOccurrences = await buildFutureScheduleOccurrences(
    schedules,
    dateContext.endDateObj,
    accountsById,
    new Map(ruleAccounts.map(account => [account.id, account])),
  );
  const { dataPoints, lowestBalance } = projectForecastData({
    accounts,
    transactions,
    futureOccurrences,
    filterInfo,
    dateContext,
  });

  return {
    dataPoints,
    lowestBalance,
    forecastStartDate: dateContext.forecastStartDate,
    forecastEndDate: dateContext.forecastEndDate,
  };
}

export type ForecastHandlers = {
  'forecast/generate': (params: {
    accountIds?: string[];
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    startDate?: string;
    endDate?: string;
  }) => Promise<ForecastResult>;
};

export const app = createApp<ForecastHandlers>();

app.method('forecast/generate', generateForecast);
