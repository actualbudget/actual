import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

type BudgetMonthCategory = {
  id: string;
  name: string;
  spent?: number;
  budgeted?: number;
  balance?: number;
  received?: number;
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
  lastMonthOverspent: number;
  toBudget: number;
};

type AggregatedBudget = {
  toBudget: number;
  fromPreviousMonth: number;
  lastMonthOverspent: number;
  categoryGroupsMap: Map<string, BudgetMonthGroup>;
};

type SankeyNode = {
  name: string;
  percentageLabel?: string;
  key: string;
};

type SankeyLink = {
  source: number;
  target: number;
  value: number;
  tooltipInfo?: Array<{ name: string; value: number }>;
};

type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

type CategoryEntry = {
  categoryGroup: string;
  categoryGroupId: string;
  category?: string;
  categoryId?: string;
  value: number;
  isIncome: boolean;
  accountName?: string;
  accountId?: string;
  payeeName?: string;
  payeeId?: string;
};

type CategoryOrder = Array<{ mainCategory: string; categories: string[] }>;

type NodeKey = string;
type NodeData = {
  to: Map<NodeKey, number>;
  value?: number;
  type: string;
  name?: string;
  tooltipInfo?: Array<{ name: string; value: number }>;
  perCentageLabel?: string;
  toBudget?: number;
};
type Graph = Map<NodeKey, NodeData>;

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
  const categoryGroupConditions = conditions.filter(
    cond => cond.field === 'category_group',
  );

  if (categoryConditions.length === 0 && categoryGroupConditions.length === 0) {
    return categoryGroups;
  }

  const matchesStringCondition = (
    id: string,
    name: string,
    cond: RuleConditionEntity,
  ): boolean => {
    const value = cond.value;
    const op = cond.op as string;
    if (op === 'is') return id === value;
    if (op === 'isNot') return id !== value;
    if (op === 'oneOf') return Array.isArray(value) && value.includes(id);
    if (op === 'notOneOf') return !Array.isArray(value) || !value.includes(id);
    if (op === 'contains') {
      return (
        typeof value === 'string' &&
        name.toLowerCase().includes(value.toLowerCase())
      );
    }
    if (op === 'doesNotContain') {
      return (
        typeof value === 'string' &&
        !name.toLowerCase().includes(value.toLowerCase())
      );
    }
    if (op === 'matches') {
      if (typeof value !== 'string') return false;
      try {
        const regex =
          value.startsWith('/') && value.lastIndexOf('/') > 0
            ? new RegExp(
                value.slice(1, value.lastIndexOf('/')),
                value.slice(value.lastIndexOf('/') + 1),
              )
            : new RegExp(value);
        return regex.test(name);
      } catch {
        return false;
      }
    }
    return false;
  };

  const categoryMatchesConditions = (
    catId: string,
    catName: string,
    groupId: string,
    groupName: string,
  ): boolean => {
    const matchesCat = (cond: RuleConditionEntity) =>
      matchesStringCondition(catId, catName, cond);
    const matchesGroup = (cond: RuleConditionEntity) =>
      matchesStringCondition(groupId, groupName, cond);

    if (conditionsOp === 'or') {
      return (
        categoryConditions.some(matchesCat) ||
        categoryGroupConditions.some(matchesGroup)
      );
    }
    // 'and': all category conditions AND all category_group conditions must match
    const catMatch =
      categoryConditions.length === 0 || categoryConditions.every(matchesCat);
    const groupMatch =
      categoryGroupConditions.length === 0 ||
      categoryGroupConditions.every(matchesGroup);
    return catMatch && groupMatch;
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
  topNcategories: number = 15,
  categorySort: 'per-group' | 'global' | 'budget-order' = 'per-group',
) {
  let groupSort: 'per-group' | 'global';
  let categoryOrder: CategoryOrder | undefined;

  if (categorySort === 'global') {
    groupSort = 'global';
  } else if (categorySort === 'budget-order') {
    groupSort = 'per-group';
    categoryOrder = categories
      .filter(g => !g.hidden && !g.is_income)
      .map(g => ({
        mainCategory: g.name,
        categories: (g.categories ?? [])
          .filter(c => !c.hidden)
          .map(c => c.name),
      }));
  } else {
    groupSort = 'per-group';
  }

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof convertToSankeyData>) => void,
  ) => {
    if (mode === 'budgeted') {
      const data = await createBudgetSpreadsheet(
        start,
        end,
        conditions,
        conditionsOp,
        topNcategories,
        groupSort,
        categoryOrder,
      )(spreadsheet, setData);
      return data;
    } else if (mode === 'spent') {
      const data = await createTransactionsSpreadsheet(
        start,
        end,
        categories,
        conditions,
        conditionsOp,
        topNcategories,
        groupSort,
        categoryOrder,
      )(spreadsheet, setData);
      return data;
    }
  };
}

function addNode(graph: Graph, key: NodeKey, type: string, name?: string) {
  if (!graph.has(key)) {
    graph.set(key, {
      to: new Map(),
      type,
      name,
    });
  }
}

function addValueToLink(
  graph: Graph,
  from: NodeKey,
  to: NodeKey,
  value: number,
) {
  const fromNode = graph.get(from)!;
  fromNode.to.set(to, (fromNode.to.get(to) ?? 0) + value);
}

function getLayer(graph: Graph, key: NodeKey): number {
  // Find parent nodes for the given key
  const parents: NodeKey[] = [];
  for (const [parentKey, data] of graph) {
    if (data.to.has(key)) {
      parents.push(parentKey);
    }
  }
  if (parents.length === 0) {
    // No parents: this is a root node, layer 0
    return 0;
  }
  // Otherwise, 1 + max parent's layer
  return 1 + Math.max(...parents.map(parentKey => getLayer(graph, parentKey)));
}

export function createBudgetSpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  topNcategories: number = 15,
  groupSort: 'per-group' | 'global' = 'per-group',
  categoryOrder?: CategoryOrder,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof convertToSankeyData>) => void,
  ) => {
    const graph: Graph = new Map();

    // Add initial budget nodes with no links
    addNode(graph, 'budgeted', 'budget', 'Budgeted');
    addNode(graph, 'available_income', 'account', 'Available income');

    const months =
      end && end !== start ? monthUtils.rangeInclusive(start, end) : [start];

    const monthResponses = await Promise.all(
      months.map(
        m =>
          send('api/budget-month', {
            month: m,
          }) as unknown as Promise<BudgetMonthResponse>,
      ),
    );

    const aggregated = monthResponses.reduce<AggregatedBudget>(
      (acc, response, index) => {
        acc.toBudget += response.toBudget;

        if (index === 0) {
          acc.fromPreviousMonth = response.fromLastMonth;
        }
        acc.lastMonthOverspent += response.lastMonthOverspent;

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
            const existingCat = existingGroup.categories.find(
              c => c.id === cat.id,
            );
            if (!existingCat) {
              existingGroup.categories.push({ ...cat });
              continue;
            }
            existingCat.budgeted =
              (existingCat.budgeted ?? 0) + (cat.budgeted ?? 0);
            existingCat.spent = (existingCat.spent ?? 0) + (cat.spent ?? 0);
            existingCat.balance =
              (existingCat.balance ?? 0) + (cat.balance ?? 0);
            existingCat.received =
              (existingCat.received ?? 0) + (cat.received ?? 0);
          }
        }

        return acc;
      },
      {
        toBudget: 0,
        fromPreviousMonth: 0,
        lastMonthOverspent: 0,
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
      .flatMap(group =>
        group.categories.map(cat => {
          const rawValue = group.is_income
            ? (cat.received ?? 0)
            : (cat.budgeted ?? 0);
          return {
            categoryGroup: group.name,
            categoryGroupId: group.id,
            category: cat.name,
            categoryId: cat.id,
            isIncome: group.is_income ? rawValue > 0 : rawValue < 0,
            value: Math.abs(rawValue),
          };
        }),
      )
      .filter(entry => entry.value > 0);

    categoryData.forEach(entry => {
      if (entry.isIncome) {
        // Payee > Available income
        addNode(graph, entry.categoryId, 'payee', entry.category);
        addValueToLink(
          graph,
          entry.categoryId,
          'available_income',
          entry.value,
        );
      } else {
        // Budgeted > Category group > Category
        addNode(
          graph,
          entry.categoryGroupId,
          'categoryGroup',
          entry.categoryGroup,
        );
        addNode(graph, entry.categoryId, 'category', entry.category);
        addValueToLink(
          graph,
          entry.categoryGroupId,
          entry.categoryId,
          entry.value,
        );
        addValueToLink(graph, 'budgeted', entry.categoryGroupId, entry.value);
        addValueToLink(graph, 'available_income', 'budgeted', entry.value);
      }
    });

    addNode(graph, 'to_budget', 'budget', 'To budget');
    addValueToLink(graph, 'available_income', 'to_budget', aggregated.toBudget);

    const nextMonthResponse = (await send('api/budget-month', {
      month: monthUtils.nextMonth(end),
    })) as unknown as BudgetMonthResponse;
    const forNextMonth =
      (nextMonthResponse.fromLastMonth ?? 0) - aggregated.toBudget;

    addNode(
      graph,
      'from_previous_month',
      'payee',
      'From ' + monthUtils.prevMonth(start),
    );
    addValueToLink(
      graph,
      'from_previous_month',
      'available_income',
      aggregated.fromPreviousMonth,
    );
    addNode(
      graph,
      'next_month',
      'categoryGroup',
      'For ' + monthUtils.nextMonth(end),
    );
    addValueToLink(graph, 'available_income', 'next_month', forNextMonth);
    addNode(graph, 'last_month_overspent', 'budget', 'Overspent');
    addValueToLink(
      graph,
      'available_income',
      'last_month_overspent',
      Math.abs(aggregated.lastMonthOverspent),
    );

    // Add extra synthetic links to position nodes at the right layers.
    // If the nodes don't exist, a link will not be created, so this is not seen in the graph.
    addValueToLink(graph, 'to_budget', 'to_budget_hidden', -1);
    addValueToLink(graph, 'next_month', 'next_month_hidden', -1);
    addValueToLink(graph, 'last_month_overspent', 'overspent_hidden', -1);

    setData(convertToSankeyData(graph));
  };
}

export function createTransactionsSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  topNcategories: number = 15,
  groupSort: 'per-group' | 'global' = 'per-group',
  categoryOrder?: CategoryOrder,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof convertToSankeyData>) => void,
  ) => {
    // gather filters user has set
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const categoryData = await fetchCategoryData(
      categories,
      conditionsOpKey,
      filters,
      start,
      end,
    );

    const graph: Graph = new Map();

    categoryData.forEach(entry => {
      if (entry.isIncome) {
        // Payee > Income category > Account
        addNode(graph, entry.categoryId!, 'payee', entry.category!);
        addNode(graph, entry.accountId!, 'account', entry.accountName!);
        addNode(graph, entry.payeeId!, 'payee', entry.payeeName!);
        addValueToLink(graph, entry.categoryId!, entry.accountId!, entry.value);
        addValueToLink(graph, entry.payeeId!, entry.categoryId!, entry.value);
      } else {
        // Account > Category group > Category
        addNode(graph, entry.accountId!, 'account', entry.accountName!);
        addNode(
          graph,
          entry.categoryGroupId,
          'categoryGroup',
          entry.categoryGroup,
        );
        addNode(graph, entry.categoryId!, 'category', entry.category!);
        addValueToLink(
          graph,
          entry.accountId!,
          entry.categoryGroupId,
          entry.value,
        );
        addValueToLink(
          graph,
          entry.categoryGroupId,
          entry.categoryId!,
          entry.value,
        );
      }
    });

    graph.forEach((data, key) => {
      if (data.type === 'account' && getLayer(graph, key) === 0) {
        // If an account node has no parents (i.e. money was spent from the account, but no money added in the timeframe),
        // connect it to a synthetic node to ensure it appears in the graph at the right layer.
        addNode(graph, key + '_hidden_payee', 'payee', '');
        addNode(graph, key + '_hidden_account', 'account', '');
        addValueToLink(
          graph,
          key + '_hidden_payee',
          key + '_hidden_account',
          -1,
        );
        addValueToLink(graph, key + '_hidden_account', key, -1);
      }
    });

    setData(convertToSankeyData(graph));
  };
}

// retrieve sum of group expenses
async function fetchCategoryData(
  categoryGroups: CategoryGroupEntity[],
  conditionsOpKey: string = '$and',
  filters: unknown[] = [],
  start: string,
  end: string,
): Promise<CategoryEntry[]> {
  const nested = await Promise.all(
    categoryGroups.map(async (categoryGroup: CategoryGroupEntity) => {
      const entries = await Promise.all(
        (categoryGroup.categories || []).map(async category => {
          const results = await aqlQuery(
            q('transactions')
              .filter({ [conditionsOpKey]: filters })
              .filter({
                $and: [
                  { date: { $gte: monthUtils.firstDayOfMonth(start) } },
                  { date: { $lte: monthUtils.lastDayOfMonth(end) } },
                ],
              })
              .filter({ category: category.id })
              .groupBy(
                categoryGroup.is_income
                  ? [
                      { $id: '$category' },
                      { $id: '$account' },
                      { $id: '$payee' },
                    ]
                  : [{ $id: '$category' }, { $id: '$account' }],
              )
              .select([
                { accountId: { $id: '$account.id' } },
                { accountName: { $id: '$account.name' } },
                { amount: { $sum: '$amount' } },
                { payeeId: { $id: '$payee.id' } },
                { payeeName: { $id: '$payee.name' } },
              ]),
          );
          return results.data
            .filter(row => categoryGroup.is_income || (row.amount ?? 0) < 0)
            .map(
              row =>
                ({
                  categoryGroup: categoryGroup.name,
                  categoryGroupId: categoryGroup.id,
                  category: category.name,
                  categoryId: category.id,
                  value: Math.abs(row.amount ?? 0),
                  isIncome: categoryGroup.is_income,
                  accountName: row.accountName ?? '',
                  accountId: row.accountId ?? '',
                  payeeName: row.payeeName ?? '',
                  payeeId: row.payeeId ?? '',
                }) satisfies CategoryEntry,
            );
        }),
      );
      return entries.flat();
    }),
  );
  return nested.flat().filter(e => e.value > 0);
}

function convertToSankeyData(graph: Graph): SankeyData {
  const nodes = Array.from(graph, ([key, data]) => ({
    key,
    name: data.name ?? key,
  }));
  const links = Array.from(graph).flatMap(([key, data]) =>
    Array.from(data.to, ([targetKey, value]) => ({
      source: nodes.findIndex(n => n.key === key) ?? -1,
      target: nodes.findIndex(n => n.key === targetKey) ?? -1,
      value,
      tooltipInfo: data.tooltipInfo,
    })),
  );

  return {
    nodes,
    links,
  };
}
