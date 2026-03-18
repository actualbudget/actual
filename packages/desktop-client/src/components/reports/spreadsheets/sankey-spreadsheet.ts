import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import type {
  CategoryGroupEntity,
  RuleConditionEntity,
} from 'loot-core/types/models';

import type { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type BudgetMonthCategory = {
  id: string;
  name: string;
  spent?: number;
  budgeted?: number;
  balance?: number;
};

type BudgetMonthGroup = {
  id: string;
  name: string;
  is_income: boolean;
  categories: BudgetMonthCategory[];
};

type BudgetMonthResponse = {
  categoryGroups: BudgetMonthGroup[];
  totalIncome: number;
  fromLastMonth: number;
  forNextMonth: number;
  toBudget: number;
};

type AggregatedBudget = {
  toBudget: number;
  fromLastMonth: number;
  forNextMonth: number;
  categoryGroupsMap: Map<string, BudgetMonthGroup>;
};

type SankeyNode = {
  name: string;
  toBudget?: number;
  nodeType: 'budget' | 'expense';
  isNegative?: boolean;
};

type SankeyLink = {
  source: number;
  target: number;
  value: number;
  isNegative?: boolean;
  tooltipInfo?: Array<{ name: string; value: number }>;
};

type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

type CategoryEntry = {
  mainCategory: string;
  subcategory: string;
  value: number;
  isNegative?: boolean;
};

// Filter budget category groups to only those matching the user's conditions.
// Budget data is fetched unconditionally from api/budget-month, so we must
// apply category conditions manually in JS (unlike the transaction path which
// passes conditions directly into the AQL query).
function filterCategoryGroups(
  categoryGroups: BudgetMonthGroup[],
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or',
): BudgetMonthGroup[] {
  const categoryConditions = conditions.filter(
    cond => cond.field === 'category',
  );

  if (categoryConditions.length === 0) {
    return categoryGroups;
  }

  const categoryMatchesConditions = (
    categoryId: string,
    categoryName: string,
    groupId: string,
    groupName: string,
  ): boolean => {
    const matchesCondition = (cond: RuleConditionEntity): boolean => {
      const value = cond.value;
      const op = cond.op as string;

      if (op === 'is') return categoryId === value;
      if (op === 'isNot') return categoryId !== value;
      if (op === 'oneOf') return Array.isArray(value) && value.includes(categoryId);
      if (op === 'notOneOf') return !Array.isArray(value) || !value.includes(categoryId);
      if (op === 'category_group') {
        return Array.isArray(value)
          ? value.includes(groupId) || value.includes(groupName)
          : groupId === value || groupName === value;
      }
      if (op === 'contains') {
        return typeof value === 'string' && categoryName.toLowerCase().includes(value.toLowerCase());
      }
      if (op === 'doesNotContain') {
        return typeof value === 'string' && !categoryName.toLowerCase().includes(value.toLowerCase());
      }
      if (op === 'matches') {
        if (typeof value !== 'string') return false;
        try {
          const regex =
            value.startsWith('/') && value.lastIndexOf('/') > 0
              ? new RegExp(value.slice(1, value.lastIndexOf('/')), value.slice(value.lastIndexOf('/') + 1))
              : new RegExp(value);
          return regex.test(categoryName);
        } catch {
          return false;
        }
      }
      return false;
    };

    return conditionsOp === 'or'
      ? categoryConditions.some(matchesCondition)
      : categoryConditions.every(matchesCondition);
  };

  return categoryGroups
    .map(group => ({
      ...group,
      categories: group.categories.filter(cat =>
        categoryMatchesConditions(cat.id, cat.name, group.id, group.name),
      ),
    }))
    .filter(group => group.categories.length > 0);
}

export function createSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  mode: 'budgeted' | 'spent' = 'spent',
  compact: boolean = false,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof transformToSankeyData>) => void,
  ) => {
    if (mode === 'budgeted') {
      const data = await createBudgetSpreadsheet(
        start,
        end,
        conditions,
        conditionsOp,
        compact,
      )(spreadsheet, setData);
      return data;
    } else if (mode === 'spent') {
      const data = await createTransactionsSpreadsheet(
        start,
        end,
        categories,
        conditions,
        conditionsOp,
        compact,
      )(spreadsheet, setData);
      return data;
    }
  };
}

export function createBudgetSpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  compact: boolean = false,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof transformToSankeyData>) => void,
  ) => {
    const months =
      end && end !== start ? monthUtils.range(start, end) : [start];

    const monthResponses = await Promise.all(
      months.map(m =>
        send('api/budget-month', { month: m }) as unknown as Promise<BudgetMonthResponse>,
      ),
    );

    const aggregated = monthResponses.reduce<AggregatedBudget>(
      (acc, response) => {
        acc.toBudget += response.toBudget;
        acc.fromLastMonth += response.fromLastMonth;
        acc.forNextMonth += response.forNextMonth;

        for (const group of response.categoryGroups) {
          const existingGroup = acc.categoryGroupsMap.get(group.id);
          if (!existingGroup) {
            acc.categoryGroupsMap.set(group.id, {
              ...group,
              categories: group.categories.map(cat => ({ ...cat })),
            });
            continue;
          }

          for (const cat of group.categories) {
            const existingCat = existingGroup.categories.find(c => c.id === cat.id);
            if (!existingCat) {
              existingGroup.categories.push({ ...cat });
              continue;
            }
            existingCat.budgeted = (existingCat.budgeted ?? 0) + (cat.budgeted ?? 0);
            existingCat.spent = (existingCat.spent ?? 0) + (cat.spent ?? 0);
            existingCat.balance = (existingCat.balance ?? 0) + (cat.balance ?? 0);
          }
        }

        return acc;
      },
      {
        toBudget: 0,
        fromLastMonth: 0,
        forNextMonth: 0,
        categoryGroupsMap: new Map<string, BudgetMonthGroup>(),
      },
    );

    const categoryGroups = Array.from(aggregated.categoryGroupsMap.values());

    const filteredCategoryGroups = filterCategoryGroups(
      categoryGroups,
      conditions,
      conditionsOp,
    );

    const categoryData: CategoryEntry[] = filteredCategoryGroups
      .filter(group => !group.is_income)
      .flatMap(group =>
        group.categories.map(cat => ({
          mainCategory: group.name,
          subcategory: cat.name,
          value: cat.budgeted ?? 0,
        })),
      );

    const { forNextMonth, toBudget } = aggregated;

    if (forNextMonth > 0) {
      categoryData.push({
        mainCategory: 'For Next Month',
        subcategory: 'For Next Month',
        value: forNextMonth,
      });
    }

    setData(transformToSankeyData(categoryData, toBudget, 'Budgeted', compact));
  };
}

export function createTransactionsSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  compact: boolean = false,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof transformToSankeyData>) => void,
  ) => {
    // gather filters user has set
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const categoryData = await fetchCategoryData(categories, conditionsOpKey, filters, start, end);

    // convert retrieved data into the proper sankey format
    setData(transformToSankeyData(categoryData, 0, 'Spent', compact));
  };
}

// retrieve sum of subcategory expenses
async function fetchCategoryData(
  categories: CategoryGroupEntity[],
  conditionsOpKey: string = '$and',
  filters: any[] = [],
  start: string,
  end: string,
): Promise<CategoryEntry[]> {
  const nested = await Promise.all(
      categories.map(async (mainCategory: CategoryGroupEntity) => {
        const entries = await Promise.all(
          (mainCategory.categories || [])
            .filter(subcategory => !subcategory?.is_income)
            .map(async subcategory => {
              const results = await aqlQuery(
                q('transactions')
                  .filter({ [conditionsOpKey]: filters })
                  .filter({
                    $and: [
                      { date: { $gte: monthUtils.firstDayOfMonth(start) } },
                      { date: { $lte: monthUtils.lastDayOfMonth(end) } },
                    ],
                  })
                  .filter({ category: subcategory.id })
                  .calculate({ $sum: '$amount' }),
              );
              return {
                mainCategory: mainCategory.name,
                subcategory: subcategory.name,
                value: results.data * -1,
              } satisfies CategoryEntry;
            }),
        );
        return entries;
      }),
    );
  return nested.flat();
}

function transformToSankeyData(
  categoryData: CategoryEntry[],
  toBudgetAmount: number = 0,
  rootNodeName: string,
  compact: boolean = false,
  topNSubcategories: number = 15,
): SankeyData {
  const data: SankeyData = { nodes: [], links: [] };

  // Determine the top N subcategory entries globally by value
  const topKeys = new Set(
    [...categoryData]
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topNSubcategories - 1)
      .map(e => `${e.mainCategory}/${e.subcategory}`),
  );

  // Compute per-main-category totals and sort descending
  const categoryTotals = new Map<string, number>();
  for (const entry of categoryData) {
    if (entry.value > 0) {
      categoryTotals.set(
        entry.mainCategory,
        (categoryTotals.get(entry.mainCategory) ?? 0) + entry.value,
      );
    }
  }

  const sortedMainCategories = [...categoryTotals.keys()].sort(
    (a, b) => (categoryTotals.get(b) ?? 0) - (categoryTotals.get(a) ?? 0),
  );

  // Add the root node first with toBudget metadata
  data.nodes.push({ name: rootNodeName, toBudget: toBudgetAmount, nodeType: 'budget' });

  // Collect (mainCategoryIndex, sum) pairs for a single shared "Other" node
  const otherLinks: Array<{ source: number; value: number; entries: Array<{ name: string; value: number }> }> = [];

  for (const mainCategoryName of sortedMainCategories) {
    const mainCategorySum = categoryTotals.get(mainCategoryName) ?? 0;

    data.nodes.push({ name: mainCategoryName, nodeType: 'expense' });
    const mainCategoryIndex = data.nodes.length - 1;
    data.links.push({ source: 0, target: mainCategoryIndex, value: mainCategorySum });

    const subcategories = categoryData
      .filter(e => e.mainCategory === mainCategoryName && e.value > 0)
      .sort((a, b) => b.value - a.value);

    let otherSum = 0;
    const otherEntries: Array<{ name: string; value: number }> = [];
    for (const entry of subcategories) {
      if (topKeys.has(`${entry.mainCategory}/${entry.subcategory}`)) {
        data.nodes.push({ name: entry.subcategory, nodeType: 'expense', isNegative: entry.isNegative });
        data.links.push({
          source: mainCategoryIndex,
          target: data.nodes.length - 1,
          value: entry.value,
          isNegative: entry.isNegative,
        });
      } else {
        otherSum += entry.value;
        otherEntries.push({ name: entry.subcategory, value: entry.value });
      }
    }
    if (otherSum > 0) {
      otherLinks.push({ source: mainCategoryIndex, value: otherSum, entries: otherEntries });
    }
  }

  // Single shared "Other" node for all below-top-N subcategories
  if (otherLinks.length > 0) {
    data.nodes.push({ name: 'Other', nodeType: 'expense' });
    const otherIndex = data.nodes.length - 1;
    for (const link of otherLinks) {
      data.links.push({ source: link.source, target: otherIndex, value: link.value, tooltipInfo: link.entries });
    }
  }

  if (compact) {
    return compactSankeyData(data, 5);
  }

  return data;
}

function compactSankeyData(
  data: SankeyData,
  topN: number = 5,
): SankeyData {
  const compactedData: SankeyData = { nodes: [], links: [] };

  // Add root node
  const rootNodeName = data.nodes[0].name;
  compactedData.nodes.push(data.nodes[0]);

  // Collect main categories and their total values
  const mainCategoryTotals = new Map<string, number>();
  for (const link of data.links) {
    const sourceNode = data.nodes[link.source];
    const targetNode = data.nodes[link.target];
    if (sourceNode.name === rootNodeName && targetNode.nodeType === 'expense') {
      mainCategoryTotals.set(
        targetNode.name,
        (mainCategoryTotals.get(targetNode.name) || 0) + link.value,
      );
    }
  }

  // Sort main categories by total value descending
  const sortedCategories = Array.from(mainCategoryTotals.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  // Take top N, lump the rest into "Other"
  const topCategories = sortedCategories.slice(0, topN);
  const otherCategories = sortedCategories.slice(topN);
  const otherTotal = otherCategories.reduce((sum, [, value]) => sum + value, 0);

  // Add top categories and "Other" if needed
  const categoriesToAdd = [...topCategories.map(([name]) => name)];
  if (otherTotal > 0) {
    categoriesToAdd.push('Other');
  }

  for (const categoryName of categoriesToAdd) {
    const originalNode = data.nodes.find(n => n.name === categoryName);
    compactedData.nodes.push(
      originalNode || { name: categoryName, nodeType: 'expense' },
    );
  }

  // Add links for top categories
  for (const [categoryName, value] of topCategories) {
    const targetIndex = compactedData.nodes.findIndex(
      n => n.name === categoryName,
    );
    compactedData.links.push({
      source: 0, // Root node
      target: targetIndex,
      value,
    });
  }

  // Add link for "Other" if needed
  if (otherTotal > 0) {
    const otherIndex = compactedData.nodes.findIndex(n => n.name === 'Other');
    compactedData.links.push({
      source: 0, // Root node
      target: otherIndex,
      value: otherTotal,
    });
  }
  return compactedData;
}
