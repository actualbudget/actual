import type {
  balanceTypeOpType,
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import type { QueryDataEntity } from '#components/reports/ReportOptions';
import { aqlQuery } from '#queries/aqlQuery';

import { fetchBudgetData } from './budgetDataQuery';
import { makeQuery } from './makeQuery';

export async function fetchSpreadsheetQueryData({
  balanceTypeOp,
  startDate,
  endDate,
  interval,
  categories,
  categoryGroups,
  conditions,
  conditionsOp,
  conditionsOpKey,
  filters,
  budgetType,
}: {
  balanceTypeOp: balanceTypeOpType | undefined;
  startDate: string;
  endDate: string;
  interval: string;
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions: RuleConditionEntity[];
  conditionsOp: string;
  conditionsOpKey: string;
  filters: unknown[];
  budgetType?: SyncedPrefs['budgetType'];
}): Promise<{ assets: QueryDataEntity[]; debts: QueryDataEntity[] }> {
  if (balanceTypeOp === 'totalBudgeted') {
    return fetchBudgetData({
      startDate,
      endDate,
      interval,
      categories,
      categoryGroups,
      conditions,
      conditionsOp: conditionsOp === 'or' ? 'or' : 'and',
      budgetType,
    });
  }

  const [assets, debts] = await Promise.all([
    aqlQuery(
      makeQuery(
        'assets',
        startDate,
        endDate,
        interval,
        conditionsOpKey,
        filters,
      ),
    ).then(({ data }) => data),
    aqlQuery(
      makeQuery(
        'debts',
        startDate,
        endDate,
        interval,
        conditionsOpKey,
        filters,
      ),
    ).then(({ data }) => data),
  ]);

  return { assets, debts };
}
