import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import type { TFunction } from 'i18next';

import { getColorScale } from '#components/reports/chart-theme';
import {
  colorIndexFromKey,
  GraphLayers,
  SpecialNodeKeys,
} from '#components/reports/spreadsheets/sankey-spreadsheet';
import type {
  Graph,
  SankeyLink,
  SankeyNode,
} from '#components/reports/spreadsheets/sankey-spreadsheet';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

/**
 * A single categorized transaction in the reporting period; the raw material
 * the drill-down views are aggregated from.
 */
export type FlowTransaction = {
  id: string;
  date: string;
  /** Signed amount in minor units (cents). */
  amount: number;
  notes: string | null;
  accountId: string;
  accountName: string;
  payeeId: string | null;
  payeeName: string;
  categoryId: string;
  categoryName: string;
  groupId: string;
  groupName: string;
  isIncome: boolean;
};

/** The ways the flows can be broken down. */
export type FlowDimension = 'account' | 'group' | 'category' | 'payee';

export type FlowKind = 'income' | 'expense';

/**
 * One level of a drill-down path.
 *
 * A `flow` segment narrows the transactions down by one dimension (e.g. "the
 * Bills category group", "Bank of America", or the categories folded into an
 * "Other" bucket). A `node` segment zooms in on a node of a pre-aggregated
 * graph (used for the budgeted view, which is not transaction based).
 */
export type DrillSegment =
  | {
      type: 'flow';
      dimension: FlowDimension;
      /** The ids to include; `null` stands for "all of them". */
      ids: string[] | null;
      name: string;
      /** Whether these are income or expense flows; undefined for accounts. */
      kind?: FlowKind;
      /** Only include transactions of this sign (reversed flows). */
      sign?: 'positive' | 'negative';
    }
  | { type: 'node'; key: string; name: string };

export type DrillPath = DrillSegment[];

/** Extra information attached to every node of a drill-down chart. */
export type DrillSankeyNode = SankeyNode & {
  /** The segment that zooming in on this node appends to the path. */
  drill?: DrillSegment | null;
  /** The transaction the node stands for, at the deepest level. */
  transactionId?: string;
  /** A short description for tooltips. */
  subtitle?: string;
};

export type DrillSankeyData = {
  nodes: DrillSankeyNode[];
  links: SankeyLink[];
};

const EXPENSE_DIMENSIONS: FlowDimension[] = [
  'account',
  'group',
  'category',
  'payee',
];
const INCOME_DIMENSIONS: FlowDimension[] = ['payee', 'category', 'account'];

function dimensionOrder(kind: FlowKind): FlowDimension[] {
  return kind === 'income' ? INCOME_DIMENSIONS : EXPENSE_DIMENSIONS;
}

export function createFlowTransactionsSpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
) {
  return async (
    _spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: FlowTransaction[]) => void,
  ) => {
    setData(await fetchFlowTransactions(start, end, conditions, conditionsOp));
  };
}

export async function fetchFlowTransactions(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
): Promise<FlowTransaction[]> {
  const { filters } = await send('make-filters-from-conditions', {
    conditions: conditions.filter(cond => !cond.customName),
  });
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

  const { data } = await aqlQuery(
    q('transactions')
      .filter({ [conditionsOpKey]: filters })
      .filter({
        $and: [
          { date: { $gte: monthUtils.firstDayOfMonth(start) } },
          { date: { $lte: monthUtils.lastDayOfMonth(end) } },
        ],
      })
      .filter({ category: { $ne: null } })
      .select([
        'id',
        'date',
        'amount',
        'notes',
        { accountId: 'account.id' },
        { accountName: 'account.name' },
        { payeeId: 'payee.id' },
        { payeeName: 'payee.name' },
        { categoryId: 'category.id' },
        { categoryName: 'category.name' },
        { groupId: 'category.group.id' },
        { groupName: 'category.group.name' },
        { isIncome: 'category.is_income' },
      ]),
  );

  const rows = data as FlowTransactionRow[];
  return rows.map(row => ({
    id: row.id,
    date: row.date,
    amount: row.amount ?? 0,
    notes: row.notes ?? null,
    accountId: row.accountId ?? '',
    accountName: row.accountName ?? '',
    payeeId: row.payeeId ?? null,
    payeeName: row.payeeName ?? '',
    categoryId: row.categoryId ?? '',
    categoryName: row.categoryName ?? '',
    groupId: row.groupId ?? '',
    groupName: row.groupName ?? '',
    isIncome: Boolean(row.isIncome),
  }));
}

/** Shape of the rows returned by the query in `fetchFlowTransactions`. */
type FlowTransactionRow = {
  id: string;
  date: string;
  amount?: number | null;
  notes?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  payeeId?: string | null;
  payeeName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  isIncome?: boolean | number | null;
};

/**
 * Maps a node of the main Sankey chart (spent view) to the drill-down segment
 * that zooming in on it represents. Returns `null` for nodes that cannot be
 * explored further.
 */
export function segmentForGraphNode(
  node: Pick<SankeyNode, 'key' | 'name' | 'layer' | 'members' | 'isNegative'>,
): DrillSegment | null {
  const { key, layer } = node;
  if (!layer || key.endsWith(SpecialNodeKeys.HiddenSuffix)) {
    return null;
  }

  const stripSuffix = (value: string) =>
    value.endsWith(SpecialNodeKeys.NegativeSuffix)
      ? value.slice(0, -SpecialNodeKeys.NegativeSuffix.length)
      : value;

  const isOther = key.endsWith(SpecialNodeKeys.OtherSuffix);
  const ids = isOther
    ? (node.members ?? []).map(stripSuffix).filter(Boolean)
    : [stripSuffix(key)];

  if (isOther && ids.length === 0) {
    return null;
  }

  switch (layer) {
    case GraphLayers.IncomePayee:
      return {
        type: 'flow',
        dimension: 'payee',
        ids,
        name: node.name,
        kind: 'income',
      };
    case GraphLayers.IncomeCategory: {
      // A refunded expense category shows up on the income side.
      const isRefund = key.endsWith(SpecialNodeKeys.NegativeSuffix);
      return {
        type: 'flow',
        dimension: 'category',
        ids,
        name: node.name,
        kind: isRefund ? 'expense' : 'income',
        sign: isRefund ? 'positive' : undefined,
      };
    }
    case GraphLayers.Account:
      if (key === SpecialNodeKeys.AllAccounts) {
        return {
          type: 'flow',
          dimension: 'account',
          ids: null,
          name: node.name,
        };
      }
      return { type: 'flow', dimension: 'account', ids, name: node.name };
    case GraphLayers.CategoryGroup: {
      // Negative income shows up on the expense side as a category.
      if (key.endsWith(SpecialNodeKeys.NegativeSuffix)) {
        return {
          type: 'flow',
          dimension: 'category',
          ids,
          name: node.name,
          kind: 'income',
          sign: 'negative',
        };
      }
      return {
        type: 'flow',
        dimension: 'group',
        ids,
        name: node.name,
        kind: 'expense',
      };
    }
    case GraphLayers.Category:
      return {
        type: 'flow',
        dimension: 'category',
        ids,
        name: node.name,
        kind: 'expense',
      };
    default:
      return null;
  }
}

function transactionValue(
  transaction: FlowTransaction,
  dimension: FlowDimension,
): string {
  switch (dimension) {
    case 'account':
      return transaction.accountId;
    case 'group':
      return transaction.groupId;
    case 'category':
      return transaction.categoryId;
    case 'payee':
    default:
      return transaction.payeeId ?? '';
  }
}

function transactionLabel(
  transaction: FlowTransaction,
  dimension: FlowDimension,
  t: TFunction,
): string {
  switch (dimension) {
    case 'account':
      return transaction.accountName;
    case 'group':
      return transaction.groupName;
    case 'category':
      return transaction.categoryName;
    case 'payee':
    default:
      return transaction.payeeName || t('No payee');
  }
}

function matchesSegment(
  transaction: FlowTransaction,
  segment: Extract<DrillSegment, { type: 'flow' }>,
): boolean {
  if (segment.sign === 'positive' && transaction.amount <= 0) return false;
  if (segment.sign === 'negative' && transaction.amount >= 0) return false;
  if (segment.ids === null) return true;
  return segment.ids.includes(transactionValue(transaction, segment.dimension));
}

/** Narrows the transactions down to those matching every segment. */
export function filterTransactionsByPath(
  transactions: FlowTransaction[],
  path: DrillPath,
): FlowTransaction[] {
  const flowSegments = path.filter(
    (segment): segment is Extract<DrillSegment, { type: 'flow' }> =>
      segment.type === 'flow',
  );
  return transactions.filter(transaction =>
    flowSegments.every(segment => matchesSegment(transaction, segment)),
  );
}

type Bucket = {
  id: string;
  name: string;
  value: number;
  count: number;
  ids?: string[];
};

function bucketBy(
  transactions: FlowTransaction[],
  dimension: FlowDimension,
  t: TFunction,
): Bucket[] {
  const buckets = new Map<string, Bucket>();
  for (const transaction of transactions) {
    const id = transactionValue(transaction, dimension);
    const bucket = buckets.get(id) ?? {
      id,
      name: transactionLabel(transaction, dimension, t),
      value: 0,
      count: 0,
    };
    bucket.value += transaction.amount;
    bucket.count += 1;
    buckets.set(id, bucket);
  }
  return Array.from(buckets.values())
    .map(bucket => ({ ...bucket, value: Math.abs(bucket.value) }))
    .filter(bucket => bucket.value > 0)
    .sort((a, b) => b.value - a.value);
}

/**
 * Keeps the `topN` largest buckets and folds the remainder into a single
 * "Other" bucket that remembers which ids it stands for.
 */
export function limitBuckets(
  buckets: Bucket[],
  topN: number,
  otherName: string,
): Bucket[] {
  if (buckets.length <= topN) {
    return buckets;
  }
  const keep = Math.max(1, topN - 1);
  const shown = buckets.slice(0, keep);
  const rest = buckets.slice(keep);
  return [
    ...shown,
    {
      id: SpecialNodeKeys.OtherSuffix,
      name: otherName,
      value: rest.reduce((sum, bucket) => sum + bucket.value, 0),
      count: rest.reduce((sum, bucket) => sum + bucket.count, 0),
      ids: rest.flatMap(bucket => bucket.ids ?? [bucket.id]),
    },
  ];
}

function colorForId(id: string): string {
  const colors = getColorScale('qualitative');
  return colors[colorIndexFromKey(id, colors.length)];
}

/**
 * The dimensions a level can still be broken down by, following the flow of
 * the money: only the dimensions downstream of what is already fixed. Going
 * back upstream (e.g. from a payee to the accounts it was paid from) would
 * repeat what the path already went through, so once nothing is left
 * downstream the individual transactions are shown.
 */
export function dimensionCandidates(
  kind: FlowKind,
  fixed: FlowDimension[],
): FlowDimension[] {
  const order = dimensionOrder(kind);
  const lastFixedIndex = Math.max(
    -1,
    ...fixed.map(dimension => order.indexOf(dimension)),
  );
  return order
    .slice(lastFixedIndex + 1)
    .filter(dimension => !fixed.includes(dimension));
}

/**
 * Which dimension the current level is broken down by: the next one
 * downstream in the flow, or the individual transactions.
 */
export function nextDimension(
  kind: FlowKind,
  fixed: FlowDimension[],
): FlowDimension | 'transaction' {
  return dimensionCandidates(kind, fixed)[0] ?? 'transaction';
}

export type BuildDrilldownOptions = {
  /** Maximum number of nodes per column (the rest is folded into "Other"). */
  topN: number;
  t: TFunction;
  /** Formats a transaction date for node labels. */
  formatDate: (date: string) => string;
};

function pathKind(path: DrillPath): FlowKind | undefined {
  for (const segment of path) {
    if (segment.type === 'flow' && segment.kind) return segment.kind;
  }
  return undefined;
}

type PendingLink = {
  sourceKey: string;
  targetKey: string;
  value: number;
  color?: string;
  tooltipInfo?: Array<{ name: string; value: number }>;
};

function resolveLinks(
  links: PendingLink[],
  nodes: DrillSankeyNode[],
): SankeyLink[] {
  const indexByKey = new Map(nodes.map((node, index) => [node.key, index]));
  return links
    .map(link => ({
      source: indexByKey.get(link.sourceKey) ?? -1,
      target: indexByKey.get(link.targetKey) ?? -1,
      value: link.value,
      color: link.color,
      tooltipInfo: link.tooltipInfo,
    }))
    .filter(link => link.source !== -1 && link.target !== -1);
}

function percentage(value: number, total: number): string {
  return total ? `${((value / total) * 100).toFixed(1)}%` : '';
}

function transactionCountLabel(count: number, t: TFunction): string {
  return count === 1
    ? t('1 transaction')
    : t('{{count}} transactions', { count });
}

/**
 * Builds the Sankey diagram for one level of a drill-down: the branch itself
 * on the left and where its money goes on the right — broken down by the
 * next dimension, or down to the individual transactions. Where the money
 * came from is not repeated; the path above the chart tells that story.
 */
export function buildDrilldownData(
  transactions: FlowTransaction[],
  path: DrillPath,
  { topN, t, formatDate }: BuildDrilldownOptions,
): DrillSankeyData {
  const current = path[path.length - 1];
  if (!current || current.type !== 'flow') {
    return { nodes: [], links: [] };
  }

  const filtered = filterTransactionsByPath(transactions, path);
  const kind = pathKind(path);
  const fixedDimensions = path
    .filter(
      (segment): segment is Extract<DrillSegment, { type: 'flow' }> =>
        segment.type === 'flow',
    )
    .map(segment => segment.dimension);

  const rightNodes: DrillSankeyNode[] = [];
  const links: PendingLink[] = [];

  const otherLabel = t('Other');
  const currentColor = colorForId(
    current.ids && current.ids.length === 1 ? current.ids[0] : current.name,
  );

  // Left: the branch itself.
  const currentKey = `current:${path.length}`;
  const currentNode: DrillSankeyNode = {
    key: currentKey,
    name: current.name,
    color: currentColor,
    drill: null,
    subtitle: transactionCountLabel(filtered.length, t),
  };

  const addBucketColumn = (
    buckets: Bucket[],
    dimension: FlowDimension,
    bucketKind: FlowKind | undefined,
  ) => {
    const columnTotal = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
    for (const bucket of buckets) {
      const isOther = bucket.id === SpecialNodeKeys.OtherSuffix;
      const key = `target:${dimension}:${bucket.id}`;
      const color = isOther ? theme.reportsGray : colorForId(bucket.id);
      const segment: DrillSegment = {
        type: 'flow',
        dimension,
        ids: isOther ? (bucket.ids ?? []) : [bucket.id],
        name: bucket.name,
        kind: bucketKind,
      };
      rightNodes.push({
        key,
        name: bucket.name,
        color,
        drill: segment,
        percentageLabel: percentage(bucket.value, columnTotal),
        subtitle: transactionCountLabel(bucket.count, t),
      });
      links.push({
        sourceKey: currentKey,
        targetKey: key,
        value: bucket.value,
        color,
      });
    }
  };

  const addTransactionColumn = (
    column: FlowTransaction[],
    showPayee: boolean,
  ) => {
    const sorted = [...column]
      .filter(transaction => transaction.amount !== 0)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const shown =
      sorted.length > topN ? sorted.slice(0, Math.max(1, topN - 1)) : sorted;
    const rest = sorted.slice(shown.length);
    const columnTotal = sorted.reduce(
      (sum, transaction) => sum + Math.abs(transaction.amount),
      0,
    );

    for (const transaction of shown) {
      const key = `transaction:${transaction.id}`;
      const details = [
        showPayee ? transaction.payeeName : null,
        transaction.notes,
      ].filter(Boolean);
      rightNodes.push({
        key,
        name: [formatDate(transaction.date), ...details].join(' · '),
        color: currentColor,
        drill: null,
        transactionId: transaction.id,
        percentageLabel: percentage(Math.abs(transaction.amount), columnTotal),
        subtitle: [
          transaction.accountName,
          transaction.categoryName,
          transaction.payeeName,
        ]
          .filter(Boolean)
          .join(' · '),
      });
      links.push({
        sourceKey: currentKey,
        targetKey: key,
        value: Math.abs(transaction.amount),
        color: currentColor,
      });
    }

    if (rest.length > 0) {
      const key = 'transaction:other';
      const restValue = rest.reduce(
        (sum, transaction) => sum + Math.abs(transaction.amount),
        0,
      );
      rightNodes.push({
        key,
        name:
          rest.length === 1
            ? t('1 more transaction')
            : t('{{count}} more transactions', { count: rest.length }),
        color: theme.reportsGray,
        drill: null,
        percentageLabel: percentage(restValue, columnTotal),
      });
      links.push({
        sourceKey: currentKey,
        targetKey: key,
        value: restValue,
        color: theme.reportsGray,
        tooltipInfo: rest.slice(0, 10).map(transaction => ({
          name: [formatDate(transaction.date), transaction.payeeName]
            .filter(Boolean)
            .join(' · '),
          value: Math.abs(transaction.amount),
        })),
      });
    }
  };

  if (kind === undefined) {
    // An account (or all accounts): show where the money that left it went.
    // An account without any spending falls back to the income it received.
    const expenses = filtered.filter(transaction => transaction.amount < 0);
    const expenseBuckets = bucketBy(expenses, 'group', t);
    if (expenseBuckets.length > 0) {
      addBucketColumn(
        limitBuckets(expenseBuckets, topN, otherLabel),
        'group',
        'expense',
      );
    } else {
      const income = filtered.filter(transaction => transaction.amount > 0);
      addBucketColumn(
        limitBuckets(bucketBy(income, 'category', t), topN, otherLabel),
        'category',
        'income',
      );
    }
  } else {
    // Right: the breakdown of this branch. Dimensions along which there is
    // nothing to split (a single bucket) are skipped, so every zoom reveals
    // something new; once nothing is left the individual transactions show.
    let breakdown: { dimension: FlowDimension; buckets: Bucket[] } | null =
      null;
    // A bucket of several items ("Other") first splits into its members.
    const candidates =
      current.ids && current.ids.length > 1
        ? [current.dimension, ...dimensionCandidates(kind, fixedDimensions)]
        : dimensionCandidates(kind, fixedDimensions);
    for (const dimension of candidates) {
      const buckets = bucketBy(filtered, dimension, t);
      if (buckets.length > 1) {
        breakdown = { dimension, buckets };
        break;
      }
    }
    if (breakdown) {
      addBucketColumn(
        limitBuckets(breakdown.buckets, topN, otherLabel),
        breakdown.dimension,
        kind,
      );
    } else {
      addTransactionColumn(filtered, !fixedDimensions.includes('payee'));
    }
  }

  const nodes = [currentNode, ...rightNodes];
  return { nodes, links: resolveLinks(links, nodes) };
}

/**
 * The drill-down used by graph based (budgeted) views: the node itself and
 * everything flowing out of it.
 */
export function buildNeighborhoodData(
  graph: Graph,
  key: string,
  t: TFunction,
): DrillSankeyData {
  const node = graph.get(key);
  if (!node) {
    return { nodes: [], links: [] };
  }

  const label = (nodeKey: string) => {
    const data = graph.get(nodeKey);
    if (!data) return nodeKey;
    return data.labelKey
      ? t(data.labelKey, data.labelParams)
      : (data.name ?? nodeKey);
  };

  // Match the colours of the main chart (see `addColors`): structural budget
  // nodes have fixed colours, everything else is keyed by id.
  const colorOf = (nodeKey: string): string => {
    const data = graph.get(nodeKey);
    if (data?.color) return data.color;
    if (data?.isNegative) return theme.toBudgetNegative;
    switch (nodeKey) {
      case SpecialNodeKeys.ToBudget:
        return theme.toBudgetPositive;
      case SpecialNodeKeys.LastMonthOverspent:
        return theme.toBudgetNegative;
      case SpecialNodeKeys.FromPrevMonth:
      case SpecialNodeKeys.ForNextMonth:
        return theme.reportsGray;
      case SpecialNodeKeys.Budgeted:
      case SpecialNodeKeys.AvailableIncome:
      case SpecialNodeKeys.AllAccounts:
        return theme.reportsBlue;
      default:
        return colorForId(nodeKey);
    }
  };

  const children = Array.from(node.to)
    .filter(([, value]) => value > 0)
    .map(([childKey, value]) => ({ key: childKey, value }))
    .sort((a, b) => b.value - a.value);
  const total = children.reduce((sum, child) => sum + child.value, 0);

  const nodes: DrillSankeyNode[] = [
    {
      key: `current:${key}`,
      name: label(key),
      color: colorOf(key),
      layer: node.type,
      drill: null,
    },
  ];
  const links: SankeyLink[] = [];

  children.forEach((child, index) => {
    const childNode = graph.get(child.key);
    const hasChildren = Array.from(childNode?.to.values() ?? []).some(
      value => value > 0,
    );
    nodes.push({
      key: `child:${child.key}`,
      name: label(child.key),
      color: colorOf(child.key),
      layer: childNode?.type,
      percentageLabel: percentage(child.value, total),
      drill: hasChildren
        ? { type: 'node', key: child.key, name: label(child.key) }
        : null,
    });
    links.push({
      source: 0,
      target: index + 1,
      value: child.value,
      color: colorOf(child.key),
    });
  });

  return { nodes, links };
}
