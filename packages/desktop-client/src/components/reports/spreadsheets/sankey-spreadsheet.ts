import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import { getColorScale } from '#components/reports/chart-theme';
import { theme } from '@actual-app/components/theme';

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
  forNextMonth?: number;
  startMonth?: string;
  endMonth?: string;
};

type SankeyNode = {
  name: string;
  percentageLabel?: string;
  key: string;
  color?: string;
};

type SankeyLink = {
  source: number;
  target: number;
  value: number;
  tooltipInfo?: Array<{ name: string; value: number }>;
  color?: string;
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

type SortMode = 'per-group' | 'global' | 'budget-order';

type NodeKey = string;
type NodeData = {
  to: Map<NodeKey, number>;
  value?: number;
  type: string;
  name?: string;
  tooltipInfo?: Array<{ name: string; value: number }>;
  percentageLabel?: string;
  color?: string;
};
type Graph = Map<NodeKey, NodeData>;

export function createSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  mode: 'budgeted' | 'spent' = 'spent',
  topNcategories: number = 15,
  categorySort: SortMode = 'per-group',
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof convertToSankeyData>) => void,
  ) => {
    let data: CategoryEntry[];
    let aggregated: AggregatedBudget;
    if (mode === 'budgeted') {
      ({ data, aggregated } = await createBudgetSpreadsheet(
        start,
        end,
        conditions,
        conditionsOp,
      )());
    } else if (mode === 'spent') {
      data = await createTransactionsSpreadsheet(
        start,
        end,
        categories,
        conditions,
        conditionsOp,
      )();
    }
    processGraphData(
      data,
      topNcategories,
      categories,
      categorySort,
      setData,
      aggregated,
    );
  };
}

export function createBudgetSpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
) {
  return async () => {
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

    const nextMonthResponse = (await send('api/budget-month', {
      month: monthUtils.nextMonth(end),
    })) as unknown as BudgetMonthResponse;
    aggregated.forNextMonth =
      (nextMonthResponse.fromLastMonth ?? 0) - aggregated.toBudget;
    aggregated.startMonth = start;
    aggregated.endMonth = end;

    return { data: categoryData, aggregated };
  };
}

export function createTransactionsSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
) {
  return async () => {
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

    return categoryData;
  };
}

function processGraphData(
  categoryData: CategoryEntry[],
  topNcategories: number,
  categories: CategoryGroupEntity[],
  categorySort: SortMode,
  setData: (data: ReturnType<typeof convertToSankeyData>) => void,
  aggregated?: AggregatedBudget,
) {
  let graph: Graph;
  if (aggregated) {
    graph = createBudgetGraph(categoryData, aggregated);
  } else {
    graph = createTransactionsGraph(categoryData);
  }
  groupOtherCategories(graph, topNcategories, categorySort);
  const sortedGraph = sortGraph(graph, categorySort, categories);
  addPercentageLabels(graph);
  addColors(graph);
  setData(convertToSankeyData(sortedGraph));
}

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

function createBudgetGraph(
  categoryData: CategoryEntry[],
  aggregated: AggregatedBudget,
): Graph {
  const graph: Graph = new Map();

  // Add initial budget nodes with no links
  addNode(graph, 'budgeted', 'budget', 'Budgeted');
  addNode(graph, 'available_income', 'account', 'Available income');

  categoryData.forEach(entry => {
    if (entry.isIncome) {
      // Payee > Available income
      addNode(graph, entry.categoryId, 'payee', entry.category);
      addValueToLink(graph, entry.categoryId, 'available_income', entry.value);
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

  addNode(
    graph,
    'from_previous_month',
    'payee',
    'From ' + monthUtils.prevMonth(aggregated!.startMonth),
  );
  addValueToLink(
    graph,
    'from_previous_month',
    'available_income',
    aggregated.fromPreviousMonth,
  );
  addNode(
    graph,
    'for_next_month',
    'budget',
    'For ' + monthUtils.nextMonth(aggregated!.endMonth),
  );
  addValueToLink(
    graph,
    'available_income',
    'for_next_month',
    aggregated.forNextMonth,
  );
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
  addValueToLink(graph, 'for_next_month', 'next_month_hidden', -1);
  addValueToLink(graph, 'last_month_overspent', 'overspent_hidden', -1);

  return graph;
}

function createTransactionsGraph(categoryData: CategoryEntry[]): Graph {
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
      addValueToLink(graph, key + '_hidden_payee', key + '_hidden_account', -1);
      addValueToLink(graph, key + '_hidden_account', key, -1);
    }
  });

  return graph;
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

function groupOtherCategories(
  graph: Graph,
  topN: number,
  categorySort: SortMode = 'per-group',
) {
  // For each category group, find the top N categories by total value and group the rest into "Other"
  const getCategoryNodes = () => ({
    categoryNodes: nodesInLayer(graph, 'category'),
    otherNodes: nodesInLayer(graph, 'other_category'),
  });
  const deletedNodes = new Map<NodeKey, { key: NodeKey; data: NodeData }[]>();

  let { categoryNodes, otherNodes } = getCategoryNodes();
  while (categoryNodes.length + otherNodes.length > topN) {
    const categoryNodeSet = new Set(categoryNodes);
    const values = new Map<NodeKey, number>();
    graph.forEach(data => {
      data.to.forEach((v, k) => {
        if (categoryNodeSet.has(k)) values.set(k, (values.get(k) ?? 0) + v);
      });
    });
    let categoryToDelete: NodeKey | undefined;
    let min = Infinity;
    for (const k of categoryNodes) {
      const val = values.get(k) ?? 0;
      if (val < min) {
        min = val;
        categoryToDelete = k;
      }
    }

    if (categoryToDelete === undefined) break; // safety

    const deletedCategoryGroupKey = getCategoryGroup(
      graph,
      categoryToDelete,
    )[0];
    const deletedCategoryGroup = deletedNodes.get(deletedCategoryGroupKey);
    if (!deletedCategoryGroup) {
      deletedNodes.set(deletedCategoryGroupKey, [
        { key: categoryToDelete, data: graph.get(categoryToDelete) },
      ]);
    } else {
      deletedNodes
        .get(deletedCategoryGroupKey)
        .push({ key: categoryToDelete, data: graph.get(categoryToDelete) });
    }

    moveToOther(graph, categoryToDelete, categorySort === 'global');
    graph.delete(categoryToDelete);

    ({ categoryNodes, otherNodes } = getCategoryNodes());
  }

  promoteOtherBack(graph, deletedNodes, categorySort === 'global');
}

function nodesInLayer(graph: Graph, layer: string): NodeKey[] {
  return Array.from(graph)
    .filter(([, data]) => data.type === layer)
    .map(([key]) => key);
}

function moveToOther(graph: Graph, key: NodeKey, globalOther: boolean = false) {
  const categoryGroup = getCategoryGroup(graph, key);
  const categoryGroupKey = categoryGroup ? categoryGroup[0] : null;
  const categoryGroupData = categoryGroupKey ? categoryGroup[1] : null;
  const categoryValue = categoryGroupData!.to.get(key)!;

  let otherGroupKey: NodeKey;
  if (globalOther) {
    otherGroupKey = 'GLOBAL_OTHER_BUCKET';
  } else {
    otherGroupKey = categoryGroupKey
      ? categoryGroupKey + '_OTHER_BUCKET'
      : 'OTHER';
  }

  addNode(graph, otherGroupKey, 'other_category', 'Other');
  addValueToLink(graph, categoryGroupKey, otherGroupKey, categoryValue);
  addTooltipInfo(graph, categoryGroupKey, key, categoryValue);
  deleteLink(graph, categoryGroupKey, key);
}

function addTooltipInfo(
  graph: Graph,
  from: NodeKey,
  to: NodeKey,
  value: number,
) {
  const fromNode = graph.get(from);
  if (!fromNode) return;
  fromNode.tooltipInfo = fromNode.tooltipInfo ?? [];
  fromNode.tooltipInfo.push({ name: graph.get(to)?.name ?? to, value });
}

function getCategoryGroup(graph: Graph, key: NodeKey) {
  return Array.from(graph).filter(
    ([, data]) => data.to.has(key) && data.type === 'categoryGroup',
  )[0];
}

function deleteLink(graph: Graph, from: NodeKey, to: NodeKey) {
  const fromNode = graph.get(from);
  if (fromNode) {
    fromNode.to.delete(to);
  }
}

function promoteOtherBack(graph, deletedNodes, globalOther: boolean = false) {
  // If an Other node only contains one category, we revert it to an ordinary node
  let otherGroupKey: NodeKey;
  deletedNodes.forEach((data, key) => {
    if (data.length === 1) {
      if (globalOther) {
        otherGroupKey = 'GLOBAL_OTHER_BUCKET';
      } else {
        otherGroupKey = key ? key + '_OTHER_BUCKET' : 'other';
      }
      addNode(graph, data[0].key, 'category', data[0].data.name);
      addValueToLink(
        graph,
        key,
        data[0].key,
        graph.get(key).to.get(otherGroupKey),
      );
      deleteLink(graph, key, otherGroupKey);
    }
  });
}

function sortGraph(
  graph: Graph,
  categorySort: SortMode = 'per-group',
  categories: CategoryGroupEntity[],
): Graph {
  let sortedEntries: Array<[string, NodeData]>;
  if (categorySort === 'global') {
    sortedEntries = Array.from(graph.entries()).sort(
      ([keyA], [keyB]) => getNodeValue(graph, keyB) - getNodeValue(graph, keyA),
    );
    moveNodeToEnd(sortedEntries, 'GLOBAL_OTHER_BUCKET');
  } else if (categorySort === 'per-group') {
    const categoryGroups = nodesInLayer(graph, 'categoryGroup');
    sortedEntries = Array.from(graph.entries()).sort(
      ([keyA], [keyB]) => getNodeValue(graph, keyB) - getNodeValue(graph, keyA),
    );

    categoryGroups.forEach(groupKey => {
      const group = graph.get(groupKey);
      if (!group) return;
      const groupToKeys = Array.from(group.to.keys());

      const groupOtherKey = groupToKeys.find(k => k.endsWith('_OTHER_BUCKET'));
      const childKeys = groupToKeys.filter(k => k !== groupOtherKey);

      const childEntries = childKeys
        .map(key => sortedEntries.find(([entryKey]) => entryKey === key))
        .filter(Boolean) as Array<[string, NodeData]>;
      childEntries.sort(
        ([a], [b]) => getNodeValue(graph, b) - getNodeValue(graph, a),
      );

      const otherEntry = groupOtherKey
        ? sortedEntries.find(([entryKey]) => entryKey === groupOtherKey)
        : undefined;

      // Remove these children ("Other" too) from their current places
      sortedEntries = sortedEntries.filter(
        ([entryKey]) =>
          !childKeys.includes(entryKey) && entryKey !== groupOtherKey,
      );

      // Insert after group node
      const groupIndex = sortedEntries.findIndex(
        ([entryKey]) => entryKey === groupKey,
      );
      if (groupIndex !== -1) {
        sortedEntries.splice(groupIndex + 1, 0, ...childEntries);
        if (otherEntry) {
          sortedEntries.splice(
            groupIndex + 1 + childEntries.length,
            0,
            otherEntry,
          );
        }
      }
    });
  } else {
    const used = new Set<NodeKey>();
    sortedEntries = []

    // 1. Add entries by category group and subcategory order
    categories.forEach(group => {
      if (graph.has(group.id)) {
        sortedEntries.push([group.id, graph.get(group.id)!]);
        used.add(group.id);
      }

      if (group.categories && group.categories.length) {
        group.categories.forEach(cat => {
          if (graph.has(cat.id)) {
            sortedEntries.push([cat.id, graph.get(cat.id)!]);
            used.add(cat.id);
          }
        });
      }

      const otherKey = `${group.id}_OTHER_BUCKET`;
      if (graph.has(otherKey)) {
        sortedEntries.push([otherKey, graph.get(otherKey)!]);
        used.add(otherKey);
      }
    });

    // 2. Add all remaining entries that weren't used (preserving graph order)
    for (const [key, data] of graph) {
      if (!used.has(key)) {
        sortedEntries.push([key, data]);
      }
    }
  }

  // We always want these nodes displayed at the bottom of their layers, so its safe to just move them to the end
  moveNodeToEnd(sortedEntries, 'to_budget');
  moveNodeToEnd(sortedEntries, 'last_month_overspent');
  moveNodeToEnd(sortedEntries, 'for_next_month');
  moveNodeToEnd(sortedEntries, 'from_previous_month');
  return new Map(sortedEntries);
}

function moveNodeToEnd(entries: Array<[string, NodeData]>, key: NodeKey) {
  const nodeIndex = entries.findIndex(([nodekey]) => nodekey === key);
  if (nodeIndex !== -1) {
    const [entry] = entries.splice(nodeIndex, 1);
    entries.push(entry);
  }
}

function getNodeValue(graph: Graph, key: NodeKey): number {
  let nodeValue: number = 0;

  if (getLayer(graph, key) === 0) {
    // Look at outgoing links for root nodes
    graph.get(key).to.forEach(value => {
      nodeValue += value ?? 0;
    });
  } else {
    graph.forEach(data => {
      nodeValue += data.to.get(key) ?? 0;
    });

    // If node is in reality a root node, masked behind hidden nodes
    if (nodeValue < 0) {
      nodeValue = 0;
      graph.get(key).to.forEach(value => {
        nodeValue += value;
      });
    }
  }
  return nodeValue;
}

function addPercentageLabels(graph) {
  const layerSums = new Map();

  // First pass: Calculate layer sums
  graph.forEach((data, key) => {
    const layer = getLayer(graph, key);
    const nodeValue = getNodeValue(graph, key);
    layerSums.set(layer, (layerSums.get(layer) ?? 0) + nodeValue);
  });

  // Second pass: Assign percentage label to each node
  graph.forEach((data, key) => {
    const layer = getLayer(graph, key);
    const nodeValue = getNodeValue(graph, key);
    const layerTotal = layerSums.get(layer) ?? 1;
    const percentage = layerTotal ? (nodeValue / layerTotal) * 100 : 0;
    data.percentageLabel = `${percentage.toFixed(1)}%`;
  });
}

function addColors(graph: Graph) {
  const colors = getColorScale('qualitative');
  const keys = [...graph.keys()].sort();

  keys.forEach((key, i) => {
    const node = graph.get(key);
    if (node) node.color = colors[i % colors.length];
  });

  setColor(graph, 'to_budget', theme.toBudgetPositive);
  setColor(graph, 'last_month_overspent', theme.toBudgetNegative);
  setColor(graph, 'from_previous_month', theme.reportsGray);
  setColor(graph, 'for_next_month', theme.reportsGray);
  setColor(graph, 'budgeted', theme.reportsBlue);
  setColor(graph, 'available_income', theme.reportsBlue);
  
}

function setColor(graph: Graph, key: NodeKey, color: string) {
  const node = graph.get(key);
  if (node) {
    node.color = color;
  }
}

function convertToSankeyData(graph: Graph): SankeyData {
  const nodes = Array.from(graph, ([key, data]) => ({
      key,
      name: data.name ?? key,
      percentageLabel: data.percentageLabel ?? '',
      color: data.color ?? undefined,
  }));
  const links = Array.from(graph).flatMap(([key, data]) =>
    Array.from(data.to, ([targetKey, value]) => {
      let tooltipInfo = [];
      if (data.tooltipInfo && targetKey.endsWith('_OTHER_BUCKET')) {
        tooltipInfo = data.tooltipInfo;
        tooltipInfo.sort((a, b) => b.value - a.value);
      }

      let color: string
      if (["payee", "account","categoryGroup"].includes(data.type)) {
        color = data.color;
      } else if (["category", "budget"].includes(data.type)) {
        const targetNode = graph.get(targetKey)
        color = targetNode ? targetNode.color : undefined;
      }

      // Specific color overrides
      if (targetKey === 'last_month_overspent') {
        color = graph.get('last_month_overspent').color
      }
      if (targetKey === 'to_budget') {
        color = graph.get('to_budget').color
      }
      if (targetKey === 'for_next_month') {
        color = graph.get('for_next_month').color
      }

      return {
        source: nodes.findIndex(n => n.key === key) ?? -1,
        target: nodes.findIndex(n => n.key === targetKey) ?? -1,
        value,
        tooltipInfo,
        color: color ?? undefined,
      };
    }),
  );

  return {
    nodes,
    links,
  };
}
