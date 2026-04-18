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
  toBudget?: number;
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
  accountName: string;
  accountId: string;
  payeeName?: string;
  payeeId?: string;
};

type CategoryOrder = Array<{ mainCategory: string; categories: string[] }>;

// Helper functions to convert raw category data into a directed, weighted graph
// and convert that into the nodes/links format expected by the Sankey component.
type NodeKey = string;
type Edge = {
  to: NodeKey;
  value: number;
  tooltipInfo?: Array<{ name: string; value: number }>;
};
type Graph = Record<NodeKey, Edge[]>;
type NodeData = {
  attributes: {
    name?: string;
    type?: string;
    isOther?: boolean;
    groupSortOrder?: number;
    percentageLabel?: string;
    toBudget?: number;
  };
};

function addTypePercentageLabels(
  graph: Graph,
  nodes: Record<NodeKey, NodeData>,
): void {
  // Build a reverse-edge lookup: key → total incoming value.
  const incoming = new Map<NodeKey, number>();
  for (const edges of Object.values(graph)) {
    for (const { to, value } of edges) {
      incoming.set(to, (incoming.get(to) ?? 0) + value);
    }
  }

  // Node value: sum of incoming links, or outgoing links for pure-source nodes (e.g. payees).
  const nodeValue = (key: NodeKey): number => {
    const inc = incoming.get(key) ?? 0;
    if (inc > 0) return inc;
    return (graph[key] ?? []).reduce((s, e) => s + e.value, 0);
  };

  // Sum values per type.
  const typeTotal = new Map<string, number>();
  for (const key of Object.keys(nodes)) {
    const type: string | undefined = nodes[key].attributes?.type;
    if (!type) continue;
    typeTotal.set(type, (typeTotal.get(type) ?? 0) + nodeValue(key));
  }

  // Write percentageLabel into each node's attributes.
  for (const key of Object.keys(nodes)) {
    const type: string | undefined = nodes[key].attributes?.type;
    if (!type) continue;
    const total = typeTotal.get(type) ?? 0;
    nodes[key].attributes.percentageLabel =
      total === 0 ? '0%' : `${((nodeValue(key) / total) * 100).toFixed(1)}%`;
  }
}

function createGraphFromCategoryData(categoryData: CategoryEntry[], toBudget?: number): {
  nodes: Record<NodeKey, NodeData>;
  graph: Graph;
} {
  const graph: Graph = {};
  const nodes: Record<NodeKey, NodeData> = {};
  // Add all nodes
  for (const entry of categoryData) {
    if (entry.isIncome) {
      nodes[entry.categoryId] = {
        attributes: { type: 'income_category', name: entry.category },
      };
      nodes[entry.payeeId] = {
        attributes: { type: 'payee', name: entry.payeeName },
      };
    } else {
      nodes[entry.categoryId] = {
        attributes: { type: 'category', name: entry.category },
      };
      nodes[entry.accountId] = {
        attributes: { type: 'account', name: entry.accountName, ...(toBudget !== undefined && { toBudget }),  },
      };
      nodes[entry.categoryGroupId] = {
        attributes: { type: 'category_group', name: entry.categoryGroup },
      };
    }
  }

  // Add edges: income payee -> income category -> account -> category group -> category
  for (const entry of categoryData) {
    if (entry.isIncome) {
      // Income category -> account
      graph[entry.categoryId] = graph[entry.categoryId] || [];
      const existingEdge = graph[entry.categoryId].find(
        e => e.to === entry.accountId,
      );
      if (existingEdge) {
        existingEdge.value += entry.value;
      } else {
        graph[entry.categoryId].push({
          to: entry.accountId,
          value: entry.value,
        });
      }

      // Payee -> income category
      if (!entry.payeeId) continue; // skip if no payee
      graph[entry.payeeId] = graph[entry.payeeId] || [];
      const existingPayeeEdge = graph[entry.payeeId].find(
        e => e.to === entry.categoryId,
      );
      if (existingPayeeEdge) {
        existingPayeeEdge.value += entry.value;
      } else {
        graph[entry.payeeId].push({ to: entry.categoryId, value: entry.value });
      }
    } else {
      // Account -> category group
      graph[entry.accountId] = graph[entry.accountId] || [];
      const existingEdge = graph[entry.accountId].find(
        e => e.to === entry.categoryGroupId,
      );
      if (existingEdge) {
        existingEdge.value += entry.value;
      } else {
        graph[entry.accountId].push({
          to: entry.categoryGroupId,
          value: entry.value,
        });
      }

      // Category group -> category
      graph[entry.categoryGroupId] = graph[entry.categoryGroupId] || [];
      const existingCatEdge = graph[entry.categoryGroupId].find(
        e => e.to === entry.categoryId,
      );
      if (existingCatEdge) {
        existingCatEdge.value += entry.value;
      } else {
        graph[entry.categoryGroupId].push({
          to: entry.categoryId,
          value: entry.value,
        });
    }
    }
  }

  // Sort all edge lists by value descending so every layer renders largest-to-smallest.
  for (const key of Object.keys(graph)) {
    graph[key].sort((a, b) => b.value - a.value);
  }

  return { nodes, graph };
}

function applyTopNCategories(
  graph: Graph,
  nodes: Record<NodeKey, NodeData>,
  topN: number,
  mode: 'per-group' | 'global' | 'budget-order',
  categoryOrder?: CategoryOrder,
): void {
  if (topN <= 0) return;

  // Build incoming-value map once.
  const incoming = new Map<NodeKey, number>();
  for (const edges of Object.values(graph)) {
    for (const { to, value } of edges) {
      incoming.set(to, (incoming.get(to) ?? 0) + value);
    }
  }

  // Collect all expense-category leaf nodes with their parent group.
  type Leaf = {
    key: NodeKey;
    groupKey: NodeKey;
    name: string;
    value: number;
    visible: boolean;
  };
  const leaves: Leaf[] = [];
  for (const [groupKey, data] of Object.entries(nodes)) {
    if (data.attributes.type !== 'category_group') continue;
    for (const edge of graph[groupKey] ?? []) {
      const catKey = edge.to;
      if (nodes[catKey]?.attributes.type !== 'category') continue;
      leaves.push({
        key: catKey,
        groupKey,
        name: nodes[catKey].attributes.name,
        value: incoming.get(catKey) ?? 0,
        visible: true,
      });
    }
  }

  // --- Greedy reduction ---
  let visibleCount = leaves.length;
  let otherNodeCount = 0;
  const perGroupHasOther = new Set<NodeKey>();

  while (visibleCount + otherNodeCount > topN && visibleCount > 0) {
    const minLeaf = leaves
      .filter(l => l.visible)
      .reduce((min, l) => (l.value < min.value ? l : min));
    minLeaf.visible = false;
    visibleCount--;

    if (mode === 'global') {
      if (otherNodeCount === 0) otherNodeCount = 1;
    } else {
      if (!perGroupHasOther.has(minLeaf.groupKey)) {
        otherNodeCount++;
        perGroupHasOther.add(minLeaf.groupKey);
      }
    }
  }

  // Promote single-entry buckets back to visible (a 1-item "Other" wastes a slot).
  if (mode === 'global') {
    const allCollapsed = leaves.filter(l => !l.visible);
    if (allCollapsed.length === 1) {
      allCollapsed[0].visible = true;
      otherNodeCount = 0;
      visibleCount++;
    }
  } else {
    for (const groupKey of perGroupHasOther) {
      const collapsed = leaves.filter(
        l => l.groupKey === groupKey && !l.visible,
      );
      if (collapsed.length === 1) {
        collapsed[0].visible = true;
        perGroupHasOther.delete(groupKey);
        otherNodeCount--;
        visibleCount++;
      }
    }
  }

  // --- Apply reduction to graph ---
  const GLOBAL_OTHER_KEY = '__other_global__';
  const collapsedByGroup = new Map<NodeKey, Leaf[]>();
  for (const leaf of leaves.filter(l => !l.visible)) {
    const list = collapsedByGroup.get(leaf.groupKey) ?? [];
    list.push(leaf);
    collapsedByGroup.set(leaf.groupKey, list);
  }

  for (const [groupKey, collapsed] of collapsedByGroup) {
    const collapsedTotal = collapsed.reduce((s, l) => s + l.value, 0);
    const tooltipInfo = [...collapsed]
      .sort((a, b) => b.value - a.value)
      .map(l => ({ name: l.name, value: l.value }));

    // Remove collapsed category edges from the group.
    const collapsedKeys = new Set(collapsed.map(l => l.key));
    graph[groupKey] = (graph[groupKey] ?? []).filter(
      e => !collapsedKeys.has(e.to),
    );

    // Remove collapsed category nodes.
    for (const key of collapsedKeys) delete nodes[key];

    if (mode === 'global') {
      if (!nodes[GLOBAL_OTHER_KEY]) {
        nodes[GLOBAL_OTHER_KEY] = {
          attributes: { type: 'category', name: 'Other', isOther: true },
        };
      }
      const existingEdge = graph[groupKey].find(e => e.to === GLOBAL_OTHER_KEY);
      if (existingEdge) {
        existingEdge.value += collapsedTotal;
        existingEdge.tooltipInfo = [
          ...(existingEdge.tooltipInfo ?? []),
          ...tooltipInfo,
        ].sort((a, b) => b.value - a.value);
      } else {
        graph[groupKey] = graph[groupKey] ?? [];
        graph[groupKey].push({
          to: GLOBAL_OTHER_KEY,
          value: collapsedTotal,
          tooltipInfo,
        });
      }
    } else {
      const otherKey = `__other_${groupKey}__`;
      nodes[otherKey] = {
        attributes: { type: 'category', name: 'Other', isOther: true },
      };
      graph[groupKey] = graph[groupKey] ?? [];
      graph[groupKey].push({
        to: otherKey,
        value: collapsedTotal,
        tooltipInfo,
      });
    }
  }

  // Sort category edges within every group: regular edges ordered by mode, Other always last.
  for (const [groupKey, data] of Object.entries(nodes)) {
    if (data.attributes.type !== 'category_group') continue;
    const edges = graph[groupKey] ?? [];
    if (edges.length === 0) continue;

    const otherEdges = edges.filter(e => nodes[e.to]?.attributes.isOther);
    const regularEdges = edges.filter(e => !nodes[e.to]?.attributes.isOther);

    if (mode === 'budget-order' && categoryOrder) {
      const order =
        categoryOrder.find(c => c.mainCategory === data.attributes.name)
          ?.categories ?? [];
      regularEdges.sort((a, b) => {
        const ai = order.indexOf(nodes[a.to]?.attributes.name ?? '');
        const bi = order.indexOf(nodes[b.to]?.attributes.name ?? '');
        if (ai === -1 && bi === -1) {
          return (incoming.get(b.to) ?? 0) - (incoming.get(a.to) ?? 0);
        }
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } else {
      regularEdges.sort(
        (a, b) => (incoming.get(b.to) ?? 0) - (incoming.get(a.to) ?? 0),
      );
    }

    graph[groupKey] = [...regularEdges, ...otherEdges];
  }

  // Determine group order: budget-order uses categoryOrder, other modes use value desc.
  const sortedGroupKeys = Object.entries(nodes)
    .filter(([, data]) => data.attributes.type === 'category_group')
    .sort((a, b) => {
      if (mode === 'budget-order' && categoryOrder) {
        const orderNames = categoryOrder.map(c => c.mainCategory);
        const ai = orderNames.indexOf(a[1].attributes.name);
        const bi = orderNames.indexOf(b[1].attributes.name);
        if (ai !== -1 || bi !== -1) {
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        }
      }
      // Default (or unlisted groups in budget-order): sort by total value desc.
      const aTotal = (graph[a[0]] ?? []).reduce((s, e) => s + e.value, 0);
      const bTotal = (graph[b[0]] ?? []).reduce((s, e) => s + e.value, 0);
      return bTotal - aTotal;
    })
    .map(([key]) => key);

  // Stamp category_group nodes with their position in the sorted group list.
  sortedGroupKeys.forEach((groupKey, i) => {
    nodes[groupKey].attributes.groupSortOrder = i;
  });

  // Stamp category nodes with a global sort index so convertToSankeyData seeds the
  // recharts nodes array in the right order.
  let globalOrder = 0;
  if (mode === 'global') {
    // Collect all visible (non-Other) category nodes across all groups, sort globally
    // by value desc, then place the single global Other node at the very end.
    const visibleCategoryEdges: Array<{ to: NodeKey; value: number }> = [];
    let globalOtherKey: NodeKey | undefined;
    for (const groupKey of sortedGroupKeys) {
      for (const edge of graph[groupKey] ?? []) {
        if (!nodes[edge.to]) continue;
        if (nodes[edge.to].attributes.isOther) {
          globalOtherKey = edge.to; // same node referenced by every group
        } else {
          visibleCategoryEdges.push({
            to: edge.to,
            value: incoming.get(edge.to) ?? 0,
          });
        }
      }
    }
    visibleCategoryEdges.sort((a, b) => b.value - a.value);
    for (const { to } of visibleCategoryEdges) {
      nodes[to].attributes.groupSortOrder = globalOrder++;
    }
    if (globalOtherKey && nodes[globalOtherKey]) {
      nodes[globalOtherKey].attributes.groupSortOrder = globalOrder++;
    }
  } else {
    // per-group / budget-order: process group by group — the unified sort above already
    // set edges in the correct per-group order (value desc or budget order).
    for (const groupKey of sortedGroupKeys) {
      for (const edge of graph[groupKey] ?? []) {
        if (nodes[edge.to]) {
          nodes[edge.to].attributes.groupSortOrder = globalOrder++;
        }
      }
    }
  }
}

function convertToSankeyData(
  graph: Graph,
  nodeData: Record<NodeKey, NodeData>,
): SankeyData {
  // Compute per-node value: max(incoming, outgoing) — mirrors recharts' getValue.
  // recharts seeds each depth column's vertical positions from the nodes array index,
  // so we must build the array in sorted order for the layout to render correctly.
  const incoming = new Map<NodeKey, number>();
  for (const edges of Object.values(graph)) {
    for (const { to, value } of edges) {
      incoming.set(to, (incoming.get(to) ?? 0) + value);
    }
  }
  const outgoing = new Map<NodeKey, number>();
  for (const [from, edges] of Object.entries(graph)) {
    outgoing.set(
      from,
      edges.reduce((s, e) => s + e.value, 0),
    );
  }
  const nodeValue = (key: NodeKey) =>
    Math.max(incoming.get(key) ?? 0, outgoing.get(key) ?? 0);

  const TYPE_ORDER: Record<string, number> = {
    payee: 0,
    income_category: 1,
    account: 2,
    category_group: 3,
    category: 4,
  };

  const sortedKeys = Object.keys(nodeData).sort((a, b) => {
    const typeA = TYPE_ORDER[nodeData[a].attributes.type] ?? 99;
    const typeB = TYPE_ORDER[nodeData[b].attributes.type] ?? 99;
    if (typeA !== typeB) return typeA - typeB;
    // Use stamped sort order if available (set by applyTopNCategories for both
    // category_group and category nodes). Handles budget-order, value-order, and
    // correct Other placement within each group — all via one stamp.
    const aSortOrder = nodeData[a].attributes.groupSortOrder;
    const bSortOrder = nodeData[b].attributes.groupSortOrder;
    if (aSortOrder !== undefined && bSortOrder !== undefined) {
      return aSortOrder - bSortOrder;
    }
    // Fallback when topN is disabled: Other at end, then largest first.
    const aIsOther = nodeData[a].attributes.isOther ? 1 : 0;
    const bIsOther = nodeData[b].attributes.isOther ? 1 : 0;
    if (aIsOther !== bIsOther) return aIsOther - bIsOther;
    return nodeValue(b) - nodeValue(a); // largest first
  });

  const nodes: SankeyNode[] = sortedKeys.map(key => ({
    name: nodeData[key].attributes.name,
    percentageLabel: nodeData[key].attributes.percentageLabel,
    attributes: nodeData[key].attributes,
    toBudget: nodeData[key].attributes.toBudget,
    key,
  }));

  const links: SankeyLink[] = Object.entries(graph).flatMap(([from, edges]) =>
    edges.map(({ to, value, tooltipInfo }) => ({
      source: nodes.findIndex(node => node.key === from),
      target: nodes.findIndex(node => node.key === to),
      value,
      tooltipInfo,
    })),
  );

  return { nodes, links };
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
            // Positive income received → inflow; positive expense budgeted → outflow.
            // A negative value flips the direction: a negatively-budgeted expense category
            // returns money to "Available income" (inflow), and vice-versa.
            isIncome: group.is_income ? rawValue > 0 : rawValue < 0,
            accountName: 'Available income',
            accountId: 'Available income',
            value: Math.abs(rawValue),
          };
        }),
      )
      .filter(entry => entry.value > 0);

    // Add fromLastMonth as a synthetic node leading to Budgeted, to visualize carryover from previous month
    if (aggregated.fromPreviousMonth !== 0) {
      categoryData.push({
        categoryGroup: 'Previous Month',
        categoryGroupId: 'previous_month',
        category: 'From ' + monthUtils.prevMonth(start),
        categoryId: 'previous_month_carryover',
        isIncome: true,
        accountName: 'Available income',
        accountId: 'Available income',
        value: Math.abs(aggregated.fromPreviousMonth),
      });
    }

    // Get next months carryover as a synthetic node leading out of Budgeted, to visualize how much was held back for next month
    const nextMonthResponse = (await send('api/budget-month', {
      month: monthUtils.nextMonth(end),
    })) as unknown as BudgetMonthResponse;
    const forNextMonth = nextMonthResponse.fromLastMonth ?? 0;
    if (forNextMonth !== 0) {
      categoryData.push({
        categoryGroup: 'For ' + monthUtils.nextMonth(end),
        categoryGroupId: 'next_month',
        isIncome: false,
        accountName: 'Available income',
        accountId: 'Available income',
        value: Math.abs(forNextMonth),
      });
    }

    // Add last month overspent as a synthetic node leading out of Budgeted, to visualize how much we overspent last month (if any)
    if (aggregated.lastMonthOverspent !== 0) {
      categoryData.push({
        categoryGroup: 'Overspent amounts',
        categoryGroupId: 'overspent',
        isIncome: false,
        accountName: 'Available income',
        accountId: 'Available income',
        value: Math.abs(aggregated.lastMonthOverspent),
      });
    }    

    const { nodes, graph } = createGraphFromCategoryData(categoryData, aggregated.toBudget);
    applyTopNCategories(
      graph,
      nodes,
      topNcategories,
      groupSort === 'global'
        ? 'global'
        : categoryOrder
          ? 'budget-order'
          : 'per-group',
      categoryOrder,
    );
    addTypePercentageLabels(graph, nodes);
    setData(convertToSankeyData(graph, nodes));
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

    const { nodes, graph } = createGraphFromCategoryData(categoryData);
    applyTopNCategories(
      graph,
      nodes,
      topNcategories,
      groupSort === 'global'
        ? 'global'
        : categoryOrder
          ? 'budget-order'
          : 'per-group',
      categoryOrder,
    );
    addTypePercentageLabels(graph, nodes);
    setData(convertToSankeyData(graph, nodes));
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

export function compactSankeyData(
  data: SankeyData,
  topN: number = 5,
): SankeyData {
  const compactedData: SankeyData = { nodes: [], links: [] };
  compactedData.nodes.push(data.nodes[0]); // root node

  // Find all root→mainCategory links and sort by value descending
  const rootLinks = data.links
    .filter(link => link.source === 0)
    .sort((a, b) => b.value - a.value);

  const topLinks = rootLinks.slice(0, topN - 1);
  const otherLinks = rootLinks.slice(topN - 1);
  const otherTotal = otherLinks.reduce((sum, link) => sum + link.value, 0);

  // Add top category nodes and their links from root
  for (const link of topLinks) {
    compactedData.nodes.push(data.nodes[link.target]);
    compactedData.links.push({
      source: 0,
      target: compactedData.nodes.length - 1,
      value: link.value,
    });
  }

  // Lump remaining categories into a single "Other" node
  if (otherTotal > 0) {
    compactedData.nodes.push({ name: 'Other', key: 'other' });
    compactedData.links.push({
      source: 0,
      target: compactedData.nodes.length - 1,
      value: otherTotal,
      tooltipInfo: otherLinks.map(link => ({
        name: data.nodes[link.target].name,
        value: link.value,
      })),
    });
  }

  return compactedData;
}
