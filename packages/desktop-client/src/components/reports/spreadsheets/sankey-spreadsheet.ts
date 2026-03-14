import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q, type Query } from 'loot-core/shared/query';
import type { CategoryEntity, CategoryGroupEntity, RuleConditionEntity } from 'loot-core/types/models';

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
  nodeType: 'budget' | 'income' | 'expense';
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
  mode: 'budgeted' | 'spent' | 'difference' = 'budgeted',
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
    } else {
      // mode === 'difference'
      const data = await createDifferenceSpreadsheet(
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

    // Build income data from income category groups
    const incomeGroups = filteredCategoryGroups.filter(
      group => group.is_income === true,
    );
    const incomeData = incomeGroups.reduce<Record<string, number>>(
      (acc, group) => {
        acc[group.name] = group.categories.reduce((categorySum, cat) => {
          return categorySum + (cat.received ?? 0);
        }, 0);
        return acc;
      },
      {},
    );

    if (fromLastMonth > 0) {
      incomeData['From Last Month'] = fromLastMonth;
    }

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
        incomeData,
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
    async function fetchCategoryData(categories: CategoryGroupEntity[]): Promise<CategoryData[]> {
      try {
        return await Promise.all(
          categories.map(async (mainCategory: CategoryGroupEntity): Promise<CategoryData> => {
            const subcategoryBalances = await Promise.all(
              (mainCategory.categories || [])
                .filter((subcategory) => !subcategory?.is_income)
                .map(async (subcategory) => {
                  const results = await aqlQuery(
                    q('transactions')
                      .filter({
                        [conditionsOpKey]: filters,
                      })
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
          }),
        );
      } catch (error) {
        console.error('Error fetching category data:', error);
        throw error; // Re-throw if you want the error to propagate
      }
    }

    // create list of Income subcategories
    const allIncomeSubcategories: CategoryEntity[] = [];
    for (const category of categories)
    {
      if (category.is_income) {
        allIncomeSubcategories.push(...(category.categories || []));
      }
    }

    const fetchIncomeData = async () => {
      // Map over allIncomeSubcategories and return an array of promises
      const promises = (allIncomeSubcategories as Array<{ id: string; name: string }>)
        .filter(subcategory => subcategory != null)
        .map(subcategory => {
          const baseQuery = q('transactions')
            .filter({
              $and: [
                { date: { $gte: monthUtils.firstDayOfMonth(start) } },
                { date: { $lte: monthUtils.lastDayOfMonth(end) } },
              ],
            })
            .filter({ category: subcategory.id })
            .groupBy(['payee'])
            .select(['payee', { amount: { $sum: '$amount' } }]);

          // Apply conditions filter
          const finalQuery: Query = conditionsOpKey === '$or' 
            ? baseQuery.filter({ $or: filters as any })
            : baseQuery.filter({ $and: filters as any });

          return aqlQuery(finalQuery);
        });

      // Use Promise.all() to wait for all queries to complete
      const resultsArrays = await Promise.all(promises);

      // unravel the results
      const payeesDict: Record<string, number> = {};
      resultsArrays.forEach(item => {
        item.data.forEach((innerItem: { payee: string; amount: number }) => {
          const key = innerItem.payee;
          if (!key) {
            return;
          }
          payeesDict[key] = (payeesDict[key] ?? 0) + innerItem.amount;
        });
      });

      // First, collect all unique IDs from payeesDict
      const payeeIds = Object.keys(payeesDict);

      const results = await aqlQuery(
        q('payees')
          .filter({ id: { $oneof: payeeIds } })
          .select(['id', 'name']),
      );

      // Convert the resulting array to a payee-name-map
      const payeeNames: Record<string, number> = {};
      results.data.forEach((item: { id: string; name: string }) => {
        if (item.name && payeesDict[item.id]) {
          payeeNames[item.name] = payeesDict[item.id];
        }
      });
      return payeeNames;
    }

    const incomeData = await fetchIncomeData();
    const categoryData = await fetchCategoryData(categories);

    // convert retrieved data into the proper sankey format
    setData(transformToSankeyData(categoryData, incomeData, 0, 'Spent'));
  };
}

export function createDifferenceSpreadsheet(
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
    type BudgetMonthResponse = {
      categoryGroups: BudgetMonthGroup[];
      totalIncome: number;
      fromLastMonth: number;
      forNextMonth: number;
      toBudget: number;
    };

    // Fetch budgeted data
    const {
      categoryGroups,
      totalIncome: _totalIncome,
      fromLastMonth,
      forNextMonth: _forNextMonth,
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

    const budgetedData: Record<string, { budgeted: number; name: string }> = {};
    const categoryGroupMap: Record<string, string> = {};

    filteredCategoryGroups.forEach(group => {
      if (!group.is_income) {
        group.categories.forEach(cat => {
          budgetedData[cat.id] = {
            budgeted: cat.budgeted || 0,
            name: cat.name,
          };
          categoryGroupMap[cat.id] = group.name;
        });
      }
    });

    // Fetch spent data using transactions
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    // Use filtered categories instead of all categories
    // Only get expense categories (non-income)
    const filteredExpenseCategories = filteredCategoryGroups
      .filter(group => !group.is_income)
      .flatMap(group => group.categories);

    async function fetchSpentData() {
      const promises = filteredExpenseCategories.map(subcategory => {
        return aqlQuery(
          q('transactions')
            .filter({
              [conditionsOpKey]: filters,
            })
            .filter({
              $and: [
                { date: { $gte: monthUtils.firstDayOfMonth(start) } },
                { date: { $lte: monthUtils.lastDayOfMonth(end) } },
              ],
            })
            .filter({ category: subcategory.id })
            .calculate({ $sum: '$amount' }),
        );
      });

      const results = await Promise.all(promises);
      const spentData: Record<string, number> = {};

      filteredExpenseCategories.forEach((subcategory, index) => {
        spentData[subcategory.id] = Math.abs(results[index].data || 0);
      });

      return spentData;
    }

    const spentData = await fetchSpentData();

    // Calculate difference (budgeted - spent)
    const differenceData: Array<{
      name: string;
      groupName: string;
      difference: number;
      isNegative: boolean;
    }> = [];

    Object.keys(budgetedData).forEach(catId => {
      const budgeted = budgetedData[catId].budgeted;
      const spent = spentData[catId] || 0;
      const difference = budgeted - spent;

      // Include all categories, even with zero difference
      differenceData.push({
        name: budgetedData[catId].name,
        groupName: categoryGroupMap[catId],
        difference,
        isNegative: difference < 0,
      });
    });

    // Group by category group
    const groupedData: Array<{
      name: string;
      balances: Array<{
        subcategory: string;
        value: number;
        isNegative?: boolean;
        actualValue?: number;
      }>;
    }> = [];

    const groupMap = new Map<
      string,
      Array<{
        subcategory: string;
        value: number;
        isNegative?: boolean;
        actualValue?: number;
      }>
    >();

    differenceData.forEach(item => {
      if (!groupMap.has(item.groupName)) {
        groupMap.set(item.groupName, []);
      }
      groupMap.get(item.groupName)?.push({
        subcategory: item.name,
        value: Math.abs(item.difference),
        isNegative: item.isNegative,
        actualValue: item.difference, // Store the actual value for display
      });
    });

    groupMap.forEach((balances, groupName) => {
      groupedData.push({
        name: groupName,
        balances,
      });
    });

    // Fetch income data for the income side
    const incomeCategories = filteredCategoryGroups
      .filter(group => group.is_income)
      .flatMap(group => group.categories);

    const incomeData: Record<string, number> = {};
    incomeCategories.forEach(cat => {
      if (cat.received && cat.received > 0) {
        incomeData[cat.name] = cat.received;
      }
    });

    if (fromLastMonth > 0) {
      incomeData['From Last Month'] = fromLastMonth;
    }

    // convert retrieved data into the proper sankey format
    setData(
      transformToSankeyData(groupedData, incomeData, 0, 'Available Funds'),
    );
  };
}

function transformToSankeyData(
  categoryData: CategoryData[],
  incomeData: Record<string, number>,
  toBudgetAmount: number = 0,
  rootNodeName: string = 'Available Funds',
): SankeyData {
  const data: SankeyData = { nodes: [], links: [] };
  const nodeNames = new Set<string>();

  // Add the root node first with toBudget metadata
  data.nodes.push({
    name: rootNodeName,
    toBudget: toBudgetAmount,
    nodeType: 'budget',
  });
  nodeNames.add(rootNodeName);

  // Handle the income sources and link them to the Budget node.
  Object.entries(incomeData).forEach(([sourceName, value]) => {
    if (!nodeNames.has(sourceName) && (value as number) > 0) {
      data.nodes.push({
        name: sourceName,
        nodeType: 'income',
      });
      nodeNames.add(sourceName);
      data.links.push({
        source: data.nodes.length - 1, // Index of the newly added node
        target: 0, // Root node is always at index 0
        value,
      });
    }
  });

  // add all category expenses that have valid subcategories and a balance
  for (const mainCategory of categoryData) {
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
