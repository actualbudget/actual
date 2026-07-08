import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import * as budgetSheet from '#server/sheet';
import type { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { RuleConditionEntity, SankeyWidget } from '#types/models';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type BudgetMonthCategory = {
  balance?: number;
  budgeted?: number;
  id: string;
  name: string;
  received?: number;
  spent?: number;
};

type BudgetMonthGroup = {
  categories: BudgetMonthCategory[];
  id: string;
  is_income: boolean;
  name: string;
};

type BudgetMonthResponse = {
  categoryGroups: BudgetMonthGroup[];
  fromLastMonth: number;
  lastMonthOverspent: number;
  toBudget: number;
};

type AggregatedBudget = {
  categoryGroupsMap: Map<string, BudgetMonthGroup>;
  endMonth: string;
  forNextMonth: number;
  fromPreviousMonth: number;
  lastMonthOverspent: number;
  startMonth: string;
  toBudget: number;
};

type CategoryEntry = {
  accountId?: string;
  accountName?: string;
  category: string;
  categoryGroup: string;
  categoryGroupId: string;
  categoryId: string;
  isIncome: boolean;
  isNegative: boolean;
  payeeId?: string;
  payeeName?: string;
  value: number;
};

type TransactionCategoryGroup = {
  categories?: Array<{
    id: string;
    name: string;
  }>;
  id: string;
  is_income?: boolean | number;
  name: string;
};

type SankeyQueryRow = {
  accountId?: string;
  accountName?: string;
  amount?: number;
  payeeId?: string;
  payeeName?: string;
};

type NodeKey = string;
type NodeData = {
  color?: string;
  isNegative?: boolean;
  labelKey?: string;
  labelParams?: Record<string, string>;
  name?: string;
  percentageLabel?: string;
  to: Map<NodeKey, number>;
  tooltipInfo?: Array<{ name: string; value: number }>;
  type: GraphLayers;
};
type Graph = Map<NodeKey, NodeData>;
type SerializedGraph = Array<
  [
    string,
    Omit<NodeData, 'to'> & {
      to: Array<[string, number]>;
    },
  ]
>;

const SpecialNodeKeys = {
  AllAccounts: 'all_income',
  AvailableIncome: 'available_income',
  Budgeted: 'budgeted',
  ForNextMonth: 'for_next_month',
  FromPrevMonth: 'from_previous_month',
  LastMonthOverspent: 'last_month_overspent',
  NegativeSuffix: '__NEGATIVE',
  ToBudget: 'to_budget',
} as const;

const GraphLayers = {
  Account: 'account',
  Budget: 'budget',
  Category: 'category',
  CategoryGroup: 'category_group',
  IncomeCategory: 'income_category',
  IncomePayee: 'payee',
} as const;
type GraphLayers = (typeof GraphLayers)[keyof typeof GraphLayers];

function getBudgetNumber(month: string, name: string): number {
  const value = budgetSheet.getCellValue(monthUtils.sheetForMonth(month), name);
  return typeof value === 'number' ? value : 0;
}

async function getBudgetMonth(month: string): Promise<BudgetMonthResponse> {
  const groups = await db.getCategoriesGrouped();
  return {
    categoryGroups: groups.map(group => ({
      categories: (group.categories ?? []).map(category => ({
        balance: getBudgetNumber(month, `leftover-${category.id}`),
        budgeted: getBudgetNumber(month, `budget-${category.id}`),
        id: category.id,
        name: category.name,
        received: getBudgetNumber(month, `sum-amount-${category.id}`),
        spent: getBudgetNumber(month, `sum-amount-${category.id}`),
      })),
      id: group.id,
      is_income: Boolean(group.is_income),
      name: group.name,
    })),
    fromLastMonth: getBudgetNumber(month, 'from-last-month'),
    lastMonthOverspent: getBudgetNumber(month, 'last-month-overspent'),
    toBudget: getBudgetNumber(month, 'to-budget'),
  };
}

function matchesStringCondition(
  id: string,
  name: string,
  condition: RuleConditionEntity,
) {
  const value = condition.value;
  if (condition.op === 'is') {
    return id === value;
  }
  if (condition.op === 'isNot') {
    return id !== value;
  }
  if (condition.op === 'oneOf') {
    return Array.isArray(value) && value.includes(id);
  }
  if (condition.op === 'notOneOf') {
    return !Array.isArray(value) || !value.includes(id);
  }
  if (condition.op === 'contains') {
    return (
      typeof value === 'string' &&
      name.toLowerCase().includes(value.toLowerCase())
    );
  }
  if (condition.op === 'doesNotContain') {
    return (
      typeof value === 'string' &&
      !name.toLowerCase().includes(value.toLowerCase())
    );
  }
  if (condition.op === 'matches') {
    if (typeof value !== 'string' || value.length > 256) {
      return false;
    }
    try {
      const regex =
        value.startsWith('/') && value.lastIndexOf('/') > 0
          ? new RegExp(value.slice(1, value.lastIndexOf('/')), 'i')
          : new RegExp(value, 'i');
      return regex.test(name);
    } catch {
      return false;
    }
  }
  return false;
}

function filterCategoryGroups(
  categoryGroups: BudgetMonthGroup[],
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or',
) {
  const categoryConditions = conditions.filter(
    condition => condition.field === GraphLayers.Category,
  );
  const categoryGroupConditions = conditions.filter(
    condition => condition.field === GraphLayers.CategoryGroup,
  );

  if (categoryConditions.length === 0 && categoryGroupConditions.length === 0) {
    return categoryGroups;
  }

  function categoryMatchesConditions(
    categoryId: string,
    categoryName: string,
    groupId: string,
    groupName: string,
  ) {
    const matchesCategory = (condition: RuleConditionEntity) =>
      matchesStringCondition(categoryId, categoryName, condition);
    const matchesGroup = (condition: RuleConditionEntity) =>
      matchesStringCondition(groupId, groupName, condition);

    if (conditionsOp === 'or') {
      return (
        categoryConditions.some(matchesCategory) ||
        categoryGroupConditions.some(matchesGroup)
      );
    }

    return (
      (categoryConditions.length === 0 ||
        categoryConditions.every(matchesCategory)) &&
      (categoryGroupConditions.length === 0 ||
        categoryGroupConditions.every(matchesGroup))
    );
  }

  return categoryGroups
    .map(group => ({
      ...group,
      categories: group.categories.filter(category =>
        categoryMatchesConditions(
          category.id,
          category.name,
          group.id,
          group.name,
        ),
      ),
    }))
    .filter(group => group.categories.length > 0);
}

async function createBudgetBaseGraph({
  conditions,
  conditionsOp,
  end,
  start,
}: {
  conditions: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  end: string;
  start: string;
}) {
  const months =
    end && end !== start ? monthUtils.rangeInclusive(start, end) : [start];
  const monthResponses = await Promise.all(months.map(getBudgetMonth));
  const accumulated = monthResponses.reduce(
    (acc, response, index) => {
      if (index === monthResponses.length - 1) {
        acc.toBudget = response.toBudget;
      }
      if (index === 0) {
        acc.fromPreviousMonth = response.fromLastMonth;
      }
      acc.lastMonthOverspent += response.lastMonthOverspent;

      for (const group of response.categoryGroups) {
        const existingGroup = acc.categoryGroupsMap.get(group.id);
        if (!existingGroup) {
          acc.categoryGroupsMap.set(group.id, {
            ...group,
            categories: group.categories.map(category => ({ ...category })),
          });
          continue;
        }

        for (const category of group.categories) {
          const existingCategory = existingGroup.categories.find(
            item => item.id === category.id,
          );
          if (!existingCategory) {
            existingGroup.categories.push({ ...category });
            continue;
          }
          existingCategory.budgeted =
            (existingCategory.budgeted ?? 0) + (category.budgeted ?? 0);
          existingCategory.spent =
            (existingCategory.spent ?? 0) + (category.spent ?? 0);
          existingCategory.balance =
            (existingCategory.balance ?? 0) + (category.balance ?? 0);
          existingCategory.received =
            (existingCategory.received ?? 0) + (category.received ?? 0);
        }
      }

      return acc;
    },
    {
      categoryGroupsMap: new Map<string, BudgetMonthGroup>(),
      fromPreviousMonth: 0,
      lastMonthOverspent: 0,
      toBudget: 0,
    },
  );
  const categoryGroups = Array.from(accumulated.categoryGroupsMap.values());
  const filteredCategoryGroups = filterCategoryGroups(
    categoryGroups,
    conditions,
    conditionsOp,
  );
  const categoryData = filteredCategoryGroups
    .flatMap(group =>
      group.categories.map(category => {
        const rawValue = group.is_income
          ? (category.received ?? 0)
          : (category.budgeted ?? 0);
        return {
          category: category.name,
          categoryGroup: group.name,
          categoryGroupId: group.id,
          categoryId: category.id,
          isIncome: group.is_income,
          isNegative: rawValue < 0,
          value: rawValue,
        } satisfies CategoryEntry;
      }),
    )
    .filter(entry => entry.value !== 0);
  const nextMonthResponse = await getBudgetMonth(monthUtils.nextMonth(end));
  const aggregated: AggregatedBudget = {
    categoryGroupsMap: accumulated.categoryGroupsMap,
    endMonth: end,
    forNextMonth: (nextMonthResponse.fromLastMonth ?? 0) - accumulated.toBudget,
    fromPreviousMonth: accumulated.fromPreviousMonth,
    lastMonthOverspent: accumulated.lastMonthOverspent,
    startMonth: start,
    toBudget: accumulated.toBudget,
  };

  return createBudgetGraph(categoryData, aggregated);
}

async function createTransactionsBaseGraph({
  categories,
  conditions,
  conditionsOp,
  end,
  groupAccounts,
  start,
}: {
  categories: TransactionCategoryGroup[];
  conditions: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  end: string;
  groupAccounts: boolean;
  start: string;
}) {
  const filters = conditionsToAQL(
    conditions.filter(cond => !cond.customName),
  ).filters;
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  const nested = await Promise.all(
    categories.map(async categoryGroup => {
      const entries = await Promise.all(
        (categoryGroup.categories ?? []).map(async category => {
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
              ])
              .serialize(),
          );
          return (results.data as SankeyQueryRow[]).map(
            row =>
              ({
                accountId: row.accountId ?? '',
                accountName:
                  groupAccounts && row.accountName && row.accountId
                    ? SpecialNodeKeys.AllAccounts
                    : (row.accountName ?? ''),
                category: category.name,
                categoryGroup: categoryGroup.name,
                categoryGroupId: categoryGroup.id,
                categoryId: category.id,
                isIncome: Boolean(categoryGroup.is_income),
                isNegative: row.amount !== undefined && row.amount < 0,
                payeeId: row.payeeId ?? '',
                payeeName: row.payeeName ?? '',
                value: Math.abs(row.amount ?? 0),
              }) satisfies CategoryEntry,
          );
        }),
      );
      return entries.flat();
    }),
  );

  return createTransactionsGraph(nested.flat());
}

function addNode(graph: Graph, key: NodeKey, type: GraphLayers, name?: string) {
  if (!graph.has(key)) {
    graph.set(key, { name, to: new Map(), type });
  }
}

function addNodeWithLabel(
  graph: Graph,
  key: NodeKey,
  type: GraphLayers,
  labelKey: string,
  labelParams?: Record<string, string>,
  isNegative?: boolean,
) {
  if (!graph.has(key)) {
    graph.set(key, {
      isNegative,
      labelKey,
      labelParams,
      to: new Map(),
      type,
    });
  }
}

function addValueToLink(
  graph: Graph,
  from: NodeKey,
  to: NodeKey,
  value: number,
) {
  const fromNode = graph.get(from);
  if (fromNode) {
    fromNode.to.set(to, (fromNode.to.get(to) ?? 0) + value);
  }
}

function createBudgetGraph(
  categoryData: CategoryEntry[],
  aggregated: AggregatedBudget,
) {
  const graph: Graph = new Map();

  addNode(graph, SpecialNodeKeys.Budgeted, GraphLayers.Budget, 'Budgeted');
  addNode(
    graph,
    SpecialNodeKeys.AvailableIncome,
    GraphLayers.Account,
    'Available funds',
  );

  for (const entry of categoryData) {
    if (entry.isIncome) {
      addNode(
        graph,
        entry.categoryId,
        GraphLayers.IncomeCategory,
        entry.category,
      );
      addValueToLink(
        graph,
        entry.categoryId,
        SpecialNodeKeys.AvailableIncome,
        entry.value,
      );
    } else if (entry.value >= 0) {
      addNode(
        graph,
        entry.categoryGroupId,
        GraphLayers.CategoryGroup,
        entry.categoryGroup,
      );
      addNode(graph, entry.categoryId, GraphLayers.Category, entry.category);
      addValueToLink(
        graph,
        entry.categoryGroupId,
        entry.categoryId,
        entry.value,
      );
      addValueToLink(
        graph,
        SpecialNodeKeys.Budgeted,
        entry.categoryGroupId,
        entry.value,
      );
      addValueToLink(
        graph,
        SpecialNodeKeys.AvailableIncome,
        SpecialNodeKeys.Budgeted,
        entry.value,
      );
    } else {
      addNodeWithLabel(
        graph,
        entry.categoryId,
        GraphLayers.Account,
        'From {{category}}',
        { category: entry.category },
        true,
      );
      addValueToLink(
        graph,
        entry.categoryId,
        SpecialNodeKeys.Budgeted,
        Math.abs(entry.value),
      );
      addValueToLink(
        graph,
        SpecialNodeKeys.AvailableIncome,
        SpecialNodeKeys.Budgeted,
        -Math.abs(entry.value),
      );
    }
  }

  if (aggregated.toBudget > 0) {
    addNodeWithLabel(
      graph,
      SpecialNodeKeys.ToBudget,
      GraphLayers.CategoryGroup,
      'To budget',
    );
    addValueToLink(
      graph,
      SpecialNodeKeys.AvailableIncome,
      SpecialNodeKeys.ToBudget,
      aggregated.toBudget,
    );
  } else {
    addNodeWithLabel(
      graph,
      SpecialNodeKeys.ToBudget,
      GraphLayers.Account,
      'Overbudgeted',
      undefined,
      true,
    );
    addValueToLink(
      graph,
      SpecialNodeKeys.ToBudget,
      SpecialNodeKeys.Budgeted,
      Math.abs(aggregated.toBudget),
    );
    addValueToLink(
      graph,
      SpecialNodeKeys.AvailableIncome,
      SpecialNodeKeys.Budgeted,
      -Math.abs(aggregated.toBudget),
    );
  }

  addNodeWithLabel(
    graph,
    SpecialNodeKeys.FromPrevMonth,
    GraphLayers.IncomeCategory,
    'From {{month}}',
    { month: monthUtils.prevMonth(aggregated.startMonth) },
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.FromPrevMonth,
    SpecialNodeKeys.AvailableIncome,
    aggregated.fromPreviousMonth,
  );
  addNodeWithLabel(
    graph,
    SpecialNodeKeys.ForNextMonth,
    GraphLayers.Budget,
    'For {{month}}',
    { month: monthUtils.nextMonth(aggregated.endMonth) },
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.AvailableIncome,
    SpecialNodeKeys.ForNextMonth,
    aggregated.forNextMonth,
  );
  addNode(
    graph,
    SpecialNodeKeys.LastMonthOverspent,
    GraphLayers.Budget,
    'Overspent',
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.AvailableIncome,
    SpecialNodeKeys.LastMonthOverspent,
    Math.abs(aggregated.lastMonthOverspent),
  );

  return graph;
}

function createTransactionsGraph(categoryData: CategoryEntry[]) {
  const graph: Graph = new Map();

  function addAccountNode(accountId: string, accountName: string): void {
    if (accountId === SpecialNodeKeys.AllAccounts) {
      addNodeWithLabel(graph, accountId, GraphLayers.Account, 'Income');
    } else {
      addNode(graph, accountId, GraphLayers.Account, accountName);
    }
  }

  for (const entry of categoryData) {
    if (!entry.accountId || !entry.accountName || !entry.categoryId) {
      continue;
    }

    if (entry.isIncome) {
      if (entry.isNegative) {
        addAccountNode(entry.accountId, entry.accountName);
        addNodeWithLabel(
          graph,
          entry.categoryId + SpecialNodeKeys.NegativeSuffix,
          GraphLayers.CategoryGroup,
          entry.payeeName ?? entry.category,
          undefined,
          true,
        );
        addValueToLink(
          graph,
          entry.accountId,
          entry.categoryId + SpecialNodeKeys.NegativeSuffix,
          entry.value,
        );
      } else {
        addNode(
          graph,
          entry.categoryId,
          GraphLayers.IncomeCategory,
          entry.category,
        );
        addAccountNode(entry.accountId, entry.accountName);
        addValueToLink(graph, entry.categoryId, entry.accountId, entry.value);
        if (entry.payeeId) {
          addNode(
            graph,
            entry.payeeId,
            GraphLayers.IncomePayee,
            entry.payeeName,
          );
          addValueToLink(graph, entry.payeeId, entry.categoryId, entry.value);
        }
      }
    } else if (entry.isNegative) {
      addAccountNode(entry.accountId, entry.accountName);
      addNode(
        graph,
        entry.categoryGroupId,
        GraphLayers.CategoryGroup,
        entry.categoryGroup,
      );
      addNode(graph, entry.categoryId, GraphLayers.Category, entry.category);
      addValueToLink(
        graph,
        entry.accountId,
        entry.categoryGroupId,
        entry.value,
      );
      addValueToLink(
        graph,
        entry.categoryGroupId,
        entry.categoryId,
        entry.value,
      );
    } else {
      addNode(
        graph,
        entry.categoryId + SpecialNodeKeys.NegativeSuffix,
        GraphLayers.IncomeCategory,
        entry.payeeName ?? entry.category,
      );
      addAccountNode(entry.accountId, entry.accountName);
      addValueToLink(
        graph,
        entry.categoryId + SpecialNodeKeys.NegativeSuffix,
        entry.accountId,
        entry.value,
      );
    }
  }

  return graph;
}

function serializeGraph(graph: Graph): SerializedGraph {
  return Array.from(graph.entries()).map(([key, node]) => [
    key,
    {
      ...node,
      to: Array.from(node.to.entries()),
    },
  ]);
}

export function createSankeyReportPlan({
  sheet,
  widget,
}: {
  sheet: Spreadsheet;
  widget: SankeyWidget;
}): ReportPlan {
  const meta = widget.meta;
  const [start, end] = calculateTimeRange(meta?.timeFrame);
  const mode = meta?.mode ?? 'spent';
  const planHash = hashString(
    stableStringify({
      end,
      meta,
      start,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const queryCells = [
    resolveName(sheetName, 'categories-dependency-query'),
    resolveName(sheetName, 'category-groups-dependency-query'),
    resolveName(sheetName, 'transactions-dependency-query'),
    resolveName(sheetName, 'zero-budgets-dependency-query'),
    resolveName(sheetName, 'reflect-budgets-dependency-query'),
  ];

  sheet.createQuery(
    sheetName,
    'categories-dependency-query',
    q('categories').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'category-groups-dependency-query',
    q('category_groups').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'transactions-dependency-query',
    q('transactions').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'zero-budgets-dependency-query',
    q('zero_budgets').calculate({ $count: '*' }).serialize(),
  );
  sheet.createQuery(
    sheetName,
    'reflect-budgets-dependency-query',
    q('reflect_budgets').calculate({ $count: '*' }).serialize(),
  );
  sheet.createStatic(sheetName, 'data', null);

  return {
    compute: async () => {
      const categories = await db.getCategoriesGrouped();
      const graph =
        mode === 'budgeted'
          ? await createBudgetBaseGraph({
              conditions: meta?.conditions ?? [],
              conditionsOp: meta?.conditionsOp ?? 'and',
              end,
              start,
            })
          : await createTransactionsBaseGraph({
              categories,
              conditions: meta?.conditions ?? [],
              conditionsOp: meta?.conditionsOp ?? 'and',
              end,
              groupAccounts: meta?.groupAccounts ?? false,
              start,
            });

      return {
        graph: serializeGraph(graph),
      };
    },
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
