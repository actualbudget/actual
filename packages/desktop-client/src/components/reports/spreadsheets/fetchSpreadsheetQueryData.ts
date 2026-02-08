import {
  type balanceTypeOpType,
  type CategoryEntity,
  type CategoryGroupEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { fetchBudgetData } from './budgetDataQuery';
import { makeQuery } from './makeQuery';

import { type QueryDataEntity } from '@desktop-client/components/reports/ReportOptions';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

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
