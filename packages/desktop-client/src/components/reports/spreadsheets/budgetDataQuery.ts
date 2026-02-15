import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from 'loot-core/types/models';

import type { BudgetMonthCell } from './budgetMonthCell';

import type { QueryDataEntity } from '@desktop-client/components/reports/ReportOptions';

type BudgetDataConditionsOp = 'and' | 'or';

async function mapWithConcurrency<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  mapper: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) {
    return [];
  }

  const results: TResult[] = new Array(items.length);
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;

  const workers = Array.from({ length: safeConcurrency }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

function filterCategoriesByConditions(
  categories: CategoryEntity[],
  conditions: RuleConditionEntity[] | undefined,
  conditionsOp: BudgetDataConditionsOp | undefined,
) {
  if (!conditions || conditions.length === 0) {
    return categories;
  }

  const categoryConditions = conditions.filter(
    (cond): cond is Extract<RuleConditionEntity, { field: 'category' }> =>
      !cond.customName && cond.field === 'category',
  );

  if (categoryConditions.length === 0) {
    return categories;
  }

  const isSupportedCondition = (
    condition: Extract<RuleConditionEntity, { field: 'category' }>,
  ) => {
    if (condition.op === 'is' || condition.op === 'isNot') {
      return typeof condition.value === 'string';
    }

    if (condition.op === 'oneOf' || condition.op === 'notOneOf') {
      return (
        Array.isArray(condition.value) &&
        condition.value.every(id => typeof id === 'string')
      );
    }

    return false;
  };

  // If we can't safely interpret any category condition, do not attempt to
  // filter categories (better to be broad than silently exclude data).
  if (!categoryConditions.every(isSupportedCondition)) {
    return categories;
  }

  const evaluateCondition = (
    category: CategoryEntity,
    condition: Extract<RuleConditionEntity, { field: 'category' }>,
  ): boolean => {
    if (condition.op === 'is') {
      return category.id === condition.value;
    }

    if (condition.op === 'isNot') {
      return category.id !== condition.value;
    }

    if (condition.op === 'oneOf') {
      return condition.value.includes(category.id);
    }

    if (condition.op === 'notOneOf') {
      return !condition.value.includes(category.id);
    }

    return true;
  };

  const op: BudgetDataConditionsOp = conditionsOp === 'or' ? 'or' : 'and';

  return categories.filter(cat =>
    op === 'or'
      ? categoryConditions.some(cond => evaluateCondition(cat, cond))
      : categoryConditions.every(cond => evaluateCondition(cat, cond)),
  );
}

export async function fetchBudgetData({
  startDate,
  endDate,
  interval,
  categories,
  categoryGroups,
  conditions,
  conditionsOp,
}: {
  startDate: string;
  endDate: string;
  interval: string;
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: BudgetDataConditionsOp;
}): Promise<{ assets: QueryDataEntity[]; debts: QueryDataEntity[] }> {
  const groupById = new Map(categoryGroups.map(g => [g.id, g] as const));
  const assets: QueryDataEntity[] = [];
  const debts: QueryDataEntity[] = [];

  const filteredCategories = filterCategoriesByConditions(
    categories,
    conditions,
    conditionsOp,
  );

  const months = monthUtils.rangeInclusive(
    monthUtils.getMonth(startDate),
    monthUtils.getMonth(endDate),
  );

  const monthFetchConcurrency = 8;
  const monthDataList = await mapWithConcurrency(
    months,
    monthFetchConcurrency,
    async month => ({
      month,
      monthData: await send('envelope-budget-month', { month }),
    }),
  );

  for (const { month, monthData } of monthDataList) {
    const dateKey = interval === 'Yearly' ? month.slice(0, 4) : month;

    for (const cat of filteredCategories) {
      if (cat.is_income) {
        continue;
      }

      const budgetCell = monthData.find((cell: BudgetMonthCell) =>
        cell.name.endsWith(`budget-${cat.id}`),
      );

      const amount = Number(budgetCell?.value) || 0;
      if (amount === 0) {
        continue;
      }

      const group = cat.group ? groupById.get(cat.group) : undefined;

      const entry: QueryDataEntity = {
        date: dateKey,
        category: cat.id,
        categoryHidden: cat.hidden ?? false,
        categoryGroup: cat.group ?? '',
        categoryGroupHidden: group?.hidden ?? false,
        account: '',
        accountOffBudget: false,
        payee: '',
        transferAccount: '',
        amount,
      };

      if (amount > 0) {
        assets.push(entry);
      } else {
        debts.push(entry);
      }
    }
  }

  return { assets, debts };
}
