import { createApp } from '#server/app';
import * as db from '#server/db';
import type { RuleConditionEntity } from '#types/models';
import type { ForecastResult, ForecastSource } from '#types/models/forecast';

import { resolveForecastAccounts } from './forecast-accounts';
import type {
  AccountWithComputedBalance,
  DbAccountForRules,
} from './forecast-accounts';
import { buildFilterInfo, getTransactions } from './forecast-filters';
import {
  buildForecastDateContext,
  createEmptyForecastResult,
  projectForecastData,
} from './forecast-projection';
import {
  buildFutureScheduleOccurrences,
  FORECAST_UNASSIGNED_ACCOUNT_ID,
  getNormalizedSchedules,
} from './forecast-schedules';

export type ForecastRequestParams = {
  accountIds?: string[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate?: string;
  endDate?: string;
  includeAccountlessSchedules?: boolean;
  source?: ForecastSource;
};

function createUnassignedForecastAccount(): AccountWithComputedBalance {
  return {
    id: FORECAST_UNASSIGNED_ACCOUNT_ID,
    name: '',
    closed: 0,
    offbudget: 0,
    balance_current: 0,
  };
}

function createUnassignedRuleAccountStub(): DbAccountForRules {
  return {
    id: FORECAST_UNASSIGNED_ACCOUNT_ID,
    name: '',
    offbudget: 0,
    closed: 0,
    tombstone: 0,
    sort_order: -1,
    bankName: '',
    bankId: '',
  } as DbAccountForRules;
}

export async function generateForecast({
  accountIds,
  conditions,
  conditionsOp,
  startDate,
  endDate,
  includeAccountlessSchedules,
}: ForecastRequestParams): Promise<ForecastResult> {
  const includeUnassigned = includeAccountlessSchedules ?? false;
  const dateContext = buildForecastDateContext(startDate, endDate);
  const { filterInfo, plainConditions, resolvedConditionsOp } = buildFilterInfo(
    conditions,
    conditionsOp,
  );
  let accounts = await resolveForecastAccounts({
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

  if (
    includeUnassigned &&
    !accounts.some(account => account.id === FORECAST_UNASSIGNED_ACCOUNT_ID)
  ) {
    accounts = [...accounts, createUnassignedForecastAccount()];
  }

  const accountIdsToQuery = accounts.map(account => account.id);
  const accountsById = new Map(accounts.map(account => [account.id, account]));
  const [schedulesRaw, transactions, ruleAccounts] = await Promise.all([
    getNormalizedSchedules(),
    getTransactions(accountIdsToQuery, filterInfo),
    db.getAccounts(),
  ]);
  const schedules = includeUnassigned
    ? schedulesRaw
    : schedulesRaw.filter(
        schedule => schedule._account !== FORECAST_UNASSIGNED_ACCOUNT_ID,
      );

  const ruleAccountsById = new Map(
    ruleAccounts.map(account => [account.id, account]),
  );
  if (includeUnassigned) {
    ruleAccountsById.set(
      FORECAST_UNASSIGNED_ACCOUNT_ID,
      createUnassignedRuleAccountStub(),
    );
  }

  const futureOccurrences = await buildFutureScheduleOccurrences(
    schedules,
    dateContext.endDateObj,
    accountsById,
    ruleAccountsById,
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
    includeAccountlessSchedules?: boolean;
    source?: ForecastSource;
  }) => Promise<ForecastResult>;
};

export const app = createApp<ForecastHandlers>();

app.method('forecast/generate', generateForecast);
