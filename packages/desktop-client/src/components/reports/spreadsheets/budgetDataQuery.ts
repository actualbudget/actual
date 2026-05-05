import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { Handlers } from '@actual-app/core/types/handlers';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import type { QueryDataEntity } from '#components/reports/ReportOptions';

import type { BudgetMonthCell } from './budgetMonthCell';

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
  categoryGroups: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] | undefined,
  conditionsOp: BudgetDataConditionsOp | undefined,
) {
  if (!conditions || conditions.length === 0) {
    return categories;
  }

  const relevantConditions = conditions.filter(
    cond =>
      !cond.customName &&
      (cond.field === 'category' || cond.field === 'category_group'),
  );

  if (relevantConditions.length === 0) {
    return categories;
  }

  // Build a UUID → name map for category groups so text-based operators
  // (contains, doesNotContain, matches) can match against the group name.
  const groupNameById = new Map<string, string>(
    categoryGroups.map(g => [g.id, g.name] as const),
  );

  const isSupportedCondition = (condition: RuleConditionEntity) => {
    if (condition.op === 'is' || condition.op === 'isNot') {
      return typeof condition.value === 'string';
    }

    if (condition.op === 'oneOf' || condition.op === 'notOneOf') {
      return (
        Array.isArray(condition.value) &&
        condition.value.every(id => typeof id === 'string')
      );
    }

    if (
      condition.op === 'contains' ||
      condition.op === 'doesNotContain' ||
      condition.op === 'matches'
    ) {
      return typeof condition.value === 'string';
    }

    return false;
  };

  // If we can't safely interpret any condition, do not attempt to
  // filter categories (better to be broad than silently exclude data).
  if (!relevantConditions.every(isSupportedCondition)) {
    return categories;
  }

  const evaluateCondition = (
    category: CategoryEntity,
    condition: RuleConditionEntity,
  ): boolean => {
    const key =
      condition.field === 'category_group' ? category.group : category.id;
    // For text-based operators, compare against the human-readable name
    const textValue =
      condition.field === 'category_group'
        ? (groupNameById.get(key ?? '') ?? key ?? '')
        : category.name;

    if (condition.op === 'is') {
      return condition.value === key;
    }

    if (condition.op === 'isNot') {
      return condition.value !== key;
    }

    if (condition.op === 'oneOf') {
      return Array.isArray(condition.value) && condition.value.includes(key);
    }

    if (condition.op === 'notOneOf') {
      return Array.isArray(condition.value) && !condition.value.includes(key);
    }

    if (condition.op === 'contains') {
      return (
        typeof condition.value === 'string' &&
        (textValue ?? '')
          .toLowerCase()
          .includes(condition.value.toLowerCase())
      );
    }

    if (condition.op === 'doesNotContain') {
      return (
        typeof condition.value === 'string' &&
        !(textValue ?? '')
          .toLowerCase()
          .includes(condition.value.toLowerCase())
      );
    }

    if (condition.op === 'matches') {
      if (typeof condition.value !== 'string' || condition.value.length > 256) {
        return false;
      }
      try {
        return new RegExp(condition.value, 'i').test(textValue ?? '');
      } catch {
        return false;
      }
    }

    return true;
  };

  const op: BudgetDataConditionsOp = conditionsOp === 'or' ? 'or' : 'and';

  return categories.filter(cat =>
    op === 'or'
      ? relevantConditions.some(cond => evaluateCondition(cat, cond))
      : relevantConditions.every(cond => evaluateCondition(cat, cond)),
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
  budgetType = 'envelope',
}: {
  startDate: string;
  endDate: string;
  interval: string;
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: BudgetDataConditionsOp;
  budgetType?: SyncedPrefs['budgetType'];
}): Promise<{ assets: QueryDataEntity[]; debts: QueryDataEntity[] }> {
  const groupById = new Map(categoryGroups.map(g => [g.id, g] as const));
  const assets: QueryDataEntity[] = [];
  const debts: QueryDataEntity[] = [];

  const filteredCategories = filterCategoriesByConditions(
    categories,
    categoryGroups,
    conditions,
    conditionsOp,
  );

  const months = monthUtils.rangeInclusive(
    monthUtils.getMonth(startDate),
    monthUtils.getMonth(endDate),
  );

  const monthFetchConcurrency = 8;
  const endpointName: keyof Handlers =
    budgetType === 'tracking'
      ? 'tracking-budget-month'
      : 'envelope-budget-month';

  const monthDataList = await mapWithConcurrency(
    months,
    monthFetchConcurrency,
    async month => ({
      month,
      monthData: await send(endpointName, { month }),
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
