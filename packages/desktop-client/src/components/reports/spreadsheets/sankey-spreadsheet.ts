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
  categoryGroupsMap: Map<string, BudgetMonthGroup>;
};

type SankeyNode = {
  name: string;
  toBudget?: number;
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
      if (op === 'oneOf') {
        return Array.isArray(value) && value.includes(categoryId);
      }
      if (op === 'notOneOf') {
        return !Array.isArray(value) || !value.includes(categoryId);
      }
      if (op === 'category_group') {
        return Array.isArray(value)
          ? value.includes(groupId) || value.includes(groupName)
          : groupId === value || groupName === value;
      }
      if (op === 'contains') {
        return (
          typeof value === 'string' &&
          categoryName.toLowerCase().includes(value.toLowerCase())
        );
      }
      if (op === 'doesNotContain') {
        return (
          typeof value === 'string' &&
          !categoryName.toLowerCase().includes(value.toLowerCase())
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
      (acc, response) => {
        acc.toBudget += response.toBudget;

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
          }
        }

        return acc;
      },
      {
        toBudget: 0,
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

    const { toBudget } = aggregated;

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

    const categoryData = await fetchCategoryData(
      categories,
      conditionsOpKey,
      filters,
      start,
      end,
    );

    // convert retrieved data into the proper sankey format
    setData(transformToSankeyData(categoryData, 0, 'Spent', compact));
  };
}

// retrieve sum of subcategory expenses
async function fetchCategoryData(
  categories: CategoryGroupEntity[],
  conditionsOpKey: string = '$and',
  filters: unknown[] = [],
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

type LeafState = {
  mainCategory: string;
  subcategory: string;
  value: number;
  isNegative: boolean;
  visible: boolean;
};

type OtherBucket = {
  total: number;
  entries: Array<{ name: string; value: number }>;
};

type GreedyReductionResult = {
  allLeaves: LeafState[];
  perCategoryOther: Map<string, OtherBucket>;
  globalOtherBucket: OtherBucket;
};

function greedyReduceLeaves(
  allLeaves: LeafState[],
  topNSubcategories: number,
  globalOther: boolean,
): GreedyReductionResult {
  const perCategoryOther = new Map<string, OtherBucket>();
  const globalOtherBucket: OtherBucket = { total: 0, entries: [] };

  let visibleCount = allLeaves.length;
  let otherNodeCount = 0;

  // Collapse the lowest-value visible leaf into an Other bucket until the
  // total displayed node count (individual + Other nodes) <= topNSubcategories.
  while (
    visibleCount + otherNodeCount > topNSubcategories &&
    visibleCount > 0
  ) {
    const minLeaf = allLeaves
      .filter(l => l.visible)
      .reduce((min, l) => (l.value < min.value ? l : min));

    minLeaf.visible = false;
    visibleCount -= 1;

    if (globalOther) {
      if (globalOtherBucket.total === 0) otherNodeCount += 1;
      globalOtherBucket.total += minLeaf.value;
      globalOtherBucket.entries.push({
        name: minLeaf.subcategory,
        value: minLeaf.value,
      });
    } else {
      if (!perCategoryOther.has(minLeaf.mainCategory)) otherNodeCount += 1;
      const bucket = perCategoryOther.get(minLeaf.mainCategory) ?? {
        total: 0,
        entries: [],
      };
      bucket.total += minLeaf.value;
      bucket.entries.push({ name: minLeaf.subcategory, value: minLeaf.value });
      perCategoryOther.set(minLeaf.mainCategory, bucket);
    }
  }

  // Promote single-entry Other buckets back to visible — a 1-item "Other"
  // node wastes a slot and hides information.
  if (globalOther) {
    if (globalOtherBucket.entries.length === 1) {
      const entry = globalOtherBucket.entries[0];
      const leaf = allLeaves.find(
        l => l.subcategory === entry.name && !l.visible,
      );
      if (leaf) {
        leaf.visible = true;
        globalOtherBucket.total = 0;
        globalOtherBucket.entries = [];
      }
    }
  } else {
    for (const [catName, bucket] of perCategoryOther) {
      if (bucket.entries.length === 1) {
        const entry = bucket.entries[0];
        const leaf = allLeaves.find(
          l =>
            l.mainCategory === catName &&
            l.subcategory === entry.name &&
            !l.visible,
        );
        if (leaf) {
          leaf.visible = true;
          perCategoryOther.delete(catName);
        }
      }
    }
  }

  return { allLeaves, perCategoryOther, globalOtherBucket };
}

function transformToSankeyData(
  categoryData: CategoryEntry[],
  toBudgetAmount: number = 0,
  rootNodeName: string,
  compact: boolean = false,
  topNSubcategories: number = 15,
  globalOther: boolean = false,
): SankeyData {
  // Phase 1 — Initialise leaves
  const allLeaves: LeafState[] = categoryData
    .filter(e => e.value > 0)
    .map(e => ({
      mainCategory: e.mainCategory,
      subcategory: e.subcategory,
      value: e.value,
      isNegative: e.isNegative ?? false,
      visible: true,
    }));

  // Phase 2 — Greedy reduction (collapse lowest-value leaves into Other buckets)
  const { perCategoryOther, globalOtherBucket } = greedyReduceLeaves(
    allLeaves,
    topNSubcategories,
    globalOther,
  );

  // Phase 3 — Compute category totals (sum of ALL leaves including collapsed)
  const categoryTotals = new Map<string, number>();
  for (const leaf of allLeaves) {
    categoryTotals.set(
      leaf.mainCategory,
      (categoryTotals.get(leaf.mainCategory) ?? 0) + leaf.value,
    );
  }

  const sortedCategories = [...categoryTotals.keys()].sort(
    (a, b) => (categoryTotals.get(b) ?? 0) - (categoryTotals.get(a) ?? 0),
  );

  // Phase 4 — Build nodes/links
  const nodes: SankeyNode[] = [
    { name: rootNodeName, toBudget: toBudgetAmount },
  ];
  const links: SankeyLink[] = [];
  const catNodeIndexMap = new Map<string, number>();

  for (const catName of sortedCategories) {
    nodes.push({ name: catName });
    const catIdx = nodes.length - 1;
    catNodeIndexMap.set(catName, catIdx);
    links.push({
      source: 0,
      target: catIdx,
      value: categoryTotals.get(catName) ?? 0,
    });

    // Visible individual subcategory nodes, sorted descending
    const visibleLeaves = allLeaves
      .filter(l => l.mainCategory === catName && l.visible)
      .sort((a, b) => b.value - a.value);

    for (const leaf of visibleLeaves) {
      nodes.push({ name: leaf.subcategory, isNegative: leaf.isNegative });
      links.push({
        source: catIdx,
        target: nodes.length - 1,
        value: leaf.value,
        isNegative: leaf.isNegative,
      });
    }

    // Per-category Other node (globalOther=false only)
    if (!globalOther) {
      const bucket = perCategoryOther.get(catName);
      if (bucket) {
        nodes.push({ name: 'Other' });
        links.push({
          source: catIdx,
          target: nodes.length - 1,
          value: bucket.total,
          tooltipInfo: [...bucket.entries].sort((a, b) => b.value - a.value),
        });
      }
    }
  }

  // Global Other node (globalOther=true only)
  if (globalOther && globalOtherBucket.total > 0) {
    nodes.push({ name: 'Other' });
    const globalOtherIdx = nodes.length - 1;

    // Group entries by main category and emit one link per group
    const byCategory = new Map<
      string,
      Array<{ name: string; value: number }>
    >();
    for (const entry of globalOtherBucket.entries) {
      // Find which main category this subcategory belongs to
      const leaf = allLeaves.find(
        l => l.subcategory === entry.name && !l.visible,
      );
      if (!leaf) continue;
      const group = byCategory.get(leaf.mainCategory) ?? [];
      group.push(entry);
      byCategory.set(leaf.mainCategory, group);
    }

    for (const [catName, entries] of byCategory) {
      const sourceCatIdx = catNodeIndexMap.get(catName);
      if (sourceCatIdx === undefined) continue;
      const groupTotal = entries.reduce((sum, e) => sum + e.value, 0);
      links.push({
        source: sourceCatIdx,
        target: globalOtherIdx,
        value: groupTotal,
        tooltipInfo: [...entries].sort((a, b) => b.value - a.value),
      });
    }
  }

  // Phase 5 — compact pass
  if (compact) {
    return compactSankeyData({ nodes, links }, 5);
  }

  return { nodes, links };
}

function compactSankeyData(data: SankeyData, topN: number = 5): SankeyData {
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
    compactedData.nodes.push({ name: 'Other' });
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
