import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import type { Query } from 'loot-core/shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from 'loot-core/types/models';

import type { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type BudgetMonthCategory = {
  id: string;
  name: string;
  received?: number;
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
};

type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

type CategoryBalance = {
  subcategory: string;
  value: number;
  isNegative?: boolean;
  actualValue?: number;
};

type CategoryData = {
  name: string;
  balances: CategoryBalance[];
};

// Helper function to filter category groups based on conditions
async function filterCategoryGroups(
  categoryGroups: BudgetMonthGroup[],
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or',
  allCategories: CategoryGroupEntity[],
): Promise<BudgetMonthGroup[]> {
  // If no conditions, return all groups
  if (!conditions || conditions.length === 0) {
    return categoryGroups;
  }

  // Build a map of category IDs to check against filters
  const categoryIdToNameMap = new Map<string, string>();
  const categoryIdToGroupMap = new Map<string, string>();

  allCategories.forEach(group => {
    group.categories?.forEach(cat => {
      categoryIdToNameMap.set(cat.id, cat.name);
      categoryIdToGroupMap.set(cat.id, group.name);
    });
  });

  // Extract category-related conditions
  const categoryConditions = conditions.filter(
    cond => cond.field === 'category',
  );

  // If no category conditions, return all groups (other filters will be applied to transactions)
  if (categoryConditions.length === 0) {
    return categoryGroups;
  }

  // Function to check if a category matches the conditions
  const categoryMatchesConditions = (categoryId: string): boolean => {
    if (conditionsOp === 'or') {
      // For OR, category matches if it matches ANY condition
      return categoryConditions.some(cond => {
        if (cond.op === 'is') {
          return categoryId === cond.value;
        } else if (cond.op === 'isNot') {
          return categoryId !== cond.value;
        } else if (cond.op === 'oneOf') {
          return Array.isArray(cond.value) && cond.value.includes(categoryId);
        } else if (cond.op === 'notOneOf') {
          return !Array.isArray(cond.value) || !cond.value.includes(categoryId);
        }
        return true;
      });
    } else {
      // For AND, category matches if it matches ALL conditions
      return categoryConditions.every(cond => {
        if (cond.op === 'is') {
          return categoryId === cond.value;
        } else if (cond.op === 'isNot') {
          return categoryId !== cond.value;
        } else if (cond.op === 'oneOf') {
          return Array.isArray(cond.value) && cond.value.includes(categoryId);
        } else if (cond.op === 'notOneOf') {
          return !Array.isArray(cond.value) || !cond.value.includes(categoryId);
        }
        return true;
      });
    }
  };

  // Filter category groups and their categories
  const filteredGroups = categoryGroups
    .map(group => ({
      ...group,
      categories: group.categories.filter(cat =>
        categoryMatchesConditions(cat.id),
      ),
    }))
    .filter(group => group.categories.length > 0);

  return filteredGroups;
}

export function createSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  mode: 'budgeted' | 'spent' = 'spent',
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof transformToSankeyData>) => void,
  ) => {
    if (mode === 'budgeted') {
      const data = await createBudgetSpreadsheet(
        start,
        categories,
        conditions,
        conditionsOp,
      )(spreadsheet, setData);
      return data;
    } else if (mode === 'spent') {
      const data = await createTransactionsSpreadsheet(
        start,
        end,
        categories,
        conditions,
        conditionsOp,
      )(spreadsheet, setData);
      return data;
    }
  };
}

export function createBudgetSpreadsheet(
  start: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof transformToSankeyData>) => void,
  ) => {
    type BudgetMonthResponse = {
      categoryGroups: BudgetMonthGroup[];
      totalIncome: number;
      fromLastMonth: number;
      forNextMonth: number;
      toBudget: number;
    };

    const {
      categoryGroups,
      totalIncome: _totalIncome,
      fromLastMonth,
      forNextMonth,
      toBudget,
    } = (await send('api/budget-month', {
      month: start,
    })) as unknown as BudgetMonthResponse;

    // Apply filters to category groups
    const filteredCategoryGroups = await filterCategoryGroups(
      categoryGroups,
      conditions,
      conditionsOp,
      categories,
    );

    // Build expense category data using budgeted amounts from the budget month
    const expenseGroups = filteredCategoryGroups.filter(
      group => group.is_income !== true,
    );
    const categoryData = expenseGroups.map(group => ({
      name: group.name,
      balances: group.categories.map(cat => ({
        subcategory: cat.name,
        value: cat.budgeted ?? 0,
      })),
    }));

    if (forNextMonth > 0) {
      categoryData.push({
        name: 'For Next Month',
        balances: [
          {
            subcategory: 'For Next Month',
            value: forNextMonth,
          },
        ],
      });
    }

    setData(
      transformToSankeyData(
        categoryData,
        toBudget,
        'Available Funds',
      ),
    );
  };
}

export function createTransactionsSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
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

    // retrieve sum of subcategory expenses
    async function fetchCategoryData(
      categories: CategoryGroupEntity[],
    ): Promise<CategoryData[]> {
      try {
        return await Promise.all(
          categories.map(
            async (
              mainCategory: CategoryGroupEntity,
            ): Promise<CategoryData> => {
              const subcategoryBalances = await Promise.all(
                (mainCategory.categories || [])
                  .filter(subcategory => !subcategory?.is_income)
                  .map(async subcategory => {
                    const results = await aqlQuery(
                      q('transactions')
                        .filter({
                          [conditionsOpKey]: filters,
                        })
                        .filter({
                          $and: [
                            {
                              date: { $gte: monthUtils.firstDayOfMonth(start) },
                            },
                            { date: { $lte: monthUtils.lastDayOfMonth(end) } },
                          ],
                        })
                        .filter({ category: subcategory.id })
                        .calculate({ $sum: '$amount' }),
                    );
                    return {
                      subcategory: subcategory.name,
                      value: results.data * -1,
                    };
                  }),
              );

              // Here you could combine, reduce or transform the subcategoryBalances if needed
              return {
                name: mainCategory.name,
                balances: subcategoryBalances,
              };
            },
          ),
        );
      } catch (error) {
        console.error('Error fetching category data:', error);
        throw error; // Re-throw if you want the error to propagate
      }
    }

    // create list of Income subcategories
    const allIncomeSubcategories: CategoryEntity[] = [];
    for (const category of categories) {
      if (category.is_income) {
        // allIncomeSubcategories.push(...(category.categories || []));
      }
    }

    const categoryData = await fetchCategoryData(categories);

    // convert retrieved data into the proper sankey format
    setData(transformToSankeyData(categoryData, 0, 'Spent'));
  };
}

function transformToSankeyData(
  categoryData: CategoryData[],
  toBudgetAmount: number = 0,
  rootNodeName: string,
): SankeyData {
  const data: SankeyData = { nodes: [], links: [] };
  const nodeNames = new Set<string>();

  // Sort category data by total value (sum of subcategories) in descending order
  categoryData.sort((a, b) => {
    const aTotal = a.balances.reduce((sum, bal) => sum + bal.value, 0);
    const bTotal = b.balances.reduce((sum, bal) => sum + bal.value, 0);
    return bTotal - aTotal;
  });

  // Add the root node first with toBudget metadata
  data.nodes.push({
    name: rootNodeName,
    toBudget: toBudgetAmount,
    nodeType: 'budget',
  });
  nodeNames.add(rootNodeName);


  // add all category expenses that have valid subcategories and a balance
  for (const mainCategory of categoryData) {
    // Sort subcategories by value in descending order
    mainCategory.balances.sort((a, b) => b.value - a.value);

    if (!nodeNames.has(mainCategory.name) && mainCategory.balances.length > 0) {
      let mainCategorySum = 0;
      for (const subCategory of mainCategory.balances) {
        if (!nodeNames.has(subCategory.subcategory) && subCategory.value > 0) {
          mainCategorySum += subCategory.value;
        }
      }
      if (mainCategorySum === 0) {
        continue;
      }

      data.nodes.push({
        name: mainCategory.name,
        nodeType: 'expense',
      });
      nodeNames.add(mainCategory.name);
      const mainCategoryIndex = data.nodes.length - 1;

      data.links.push({
        source: 0, // Root node
        target: mainCategoryIndex,
        value: mainCategorySum,
      });

      // add the subcategories of the main category
      for (const subCategory of mainCategory.balances) {
        if (!nodeNames.has(subCategory.subcategory) && subCategory.value > 0) {
          data.nodes.push({
            name: subCategory.subcategory,
            nodeType: 'expense',
            isNegative: subCategory.isNegative,
          });
          nodeNames.add(subCategory.subcategory);
          const subCategoryIndex = data.nodes.length - 1;

          data.links.push({
            source: mainCategoryIndex,
            target: subCategoryIndex,
            value: subCategory.value,
            isNegative: subCategory.isNegative,
          });
        }
      }
    }
  }

  return data;
}
