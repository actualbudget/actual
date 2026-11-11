import type {
  DashboardWidgetEntity,
  NewDashboardWidgetEntity,
} from '#types/models';

export const DEFAULT_DASHBOARD_STATE: NewDashboardWidgetEntity[] = [
  // Top row: Key metrics at a glance
  {
    type: 'summary-card',
    width: 3,
    height: 2,
    x: 0,
    y: 0,
    meta: {
      name: 'Total Income (YTD)',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 20,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'yearToDate',
      },
      conditions: [
        {
          field: 'amount',
          op: 'gt',
          value: 0,
        },
        {
          field: 'account',
          op: 'onBudget',
          value: '',
        },
        {
          field: 'transfer',
          op: 'is',
          value: false,
        },
      ],
      conditionsOp: 'and',
    },
  },
  {
    type: 'summary-card',
    width: 3,
    height: 2,
    x: 3,
    y: 0,
    meta: {
      name: 'Total Expenses (YTD)',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 20,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'yearToDate',
      },
      conditions: [
        {
          field: 'amount',
          op: 'lt',
          value: 0,
        },
        {
          field: 'account',
          op: 'onBudget',
          value: '',
        },
        {
          field: 'transfer',
          op: 'is',
          value: false,
        },
      ],
      conditionsOp: 'and',
    },
  },
  {
    type: 'summary-card',
    width: 3,
    height: 2,
    x: 6,
    y: 0,
    meta: {
      name: 'Avg Per Month',
      content: JSON.stringify({
        type: 'avgPerMonth',
        fontSize: 20,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'yearToDate',
      },
      conditions: [
        {
          field: 'amount',
          op: 'lt',
          value: 0,
        },
        {
          field: 'account',
          op: 'onBudget',
          value: '',
        },
        {
          field: 'transfer',
          op: 'is',
          value: false,
        },
      ],
      conditionsOp: 'and',
    },
  },
  {
    type: 'summary-card',
    width: 3,
    height: 2,
    x: 9,
    y: 0,
    meta: {
      name: 'Avg Per Transaction',
      content: JSON.stringify({
        type: 'avgPerTransact',
        fontSize: 20,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'yearToDate',
      },
      conditions: [
        {
          field: 'amount',
          op: 'lt',
          value: 0,
        },
        {
          field: 'account',
          op: 'onBudget',
          value: '',
        },
        {
          field: 'transfer',
          op: 'is',
          value: false,
        },
      ],
      conditionsOp: 'and',
    },
  },
  // Second row: where the money flows (interactive Sankey diagram)
  {
    type: 'sankey-card',
    width: 12,
    height: 4,
    x: 0,
    y: 2,
    meta: {
      name: 'Money Flow',
      mode: 'spent',
    },
  },
  // Third row: Net worth and cash flow side by side
  {
    type: 'net-worth-card',
    width: 6,
    height: 2,
    x: 0,
    y: 6,
    meta: null,
  },
  {
    type: 'cash-flow-card',
    width: 6,
    height: 2,
    x: 6,
    y: 6,
    meta: null,
  },
  // Fourth row: Spending comparisons
  {
    type: 'spending-card',
    width: 4,
    height: 2,
    x: 0,
    y: 8,
    meta: {
      name: 'This Month',
      mode: 'single-month',
    },
  },
  {
    type: 'spending-card',
    width: 4,
    height: 2,
    x: 4,
    y: 8,
    meta: {
      name: 'Budget Overview',
      mode: 'budget',
    },
  },
  {
    type: 'spending-card',
    width: 4,
    height: 2,
    x: 8,
    y: 8,
    meta: {
      name: '3-Month Average',
      mode: 'average',
    },
  },
  // Fifth row: Calendar and savings rate
  {
    type: 'calendar-card',
    width: 8,
    height: 4,
    x: 0,
    y: 10,
    meta: {
      name: 'Transaction Calendar',
      // A single (current) month by default; adjustable from the dashboard's
      // edit mode.
      monthsShown: 1,
      conditions: [
        {
          field: 'transfer',
          op: 'is',
          value: false,
        },
      ],
      conditionsOp: 'and',
    },
  },
  {
    type: 'summary-card',
    width: 4,
    height: 2,
    x: 8,
    y: 10,
    meta: {
      name: 'Recent Net Worth Change',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 32,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-03-31',
        mode: 'sliding-window',
      },
      conditions: [],
      conditionsOp: 'and',
    },
  },
  {
    type: 'markdown-card',
    width: 4,
    height: 2,
    x: 8,
    y: 12,
    meta: {
      content:
        '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".',
    },
  },
];

/**
 * Widget settings that only change how a card is labelled, not what it shows.
 * Two widgets that differ solely in these are still considered duplicates.
 */
const COSMETIC_META_KEYS = new Set(['name']);

/**
 * Per widget type, the values a card falls back to when the setting is
 * absent. A widget with `meta: null` and one that spells out exactly these
 * defaults show the same information.
 */
const WIDGET_META_DEFAULTS: Partial<
  Record<DashboardWidgetEntity['type'], Record<string, unknown>>
> = {
  'net-worth-card': { interval: 'Monthly', mode: 'trend' },
  'spending-card': { mode: 'single-month' },
  'age-of-money-card': { granularity: 'monthly' },
  'balance-forecast-card': { granularity: 'Monthly' },
  'budget-analysis-card': {
    graphType: 'Bar',
    showBalance: true,
    balanceOnly: false,
    showHiddenCategories: false,
  },
  'crossover-card': {
    showHiddenCategories: false,
    safeWithdrawalRate: 0.04,
    projectionType: 'hampel',
    expenseAdjustmentFactor: 1,
  },
  'sankey-card': {
    mode: 'spent',
    topNcategories: 15,
    categorySort: 'per-group',
    showPercentages: false,
    groupAccounts: false,
    showTransfers: false,
  },
  'calendar-card': { monthsShown: 1 },
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
      );
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

type WidgetContent = Pick<DashboardWidgetEntity, 'type'> & {
  meta: unknown;
};

/**
 * Reduces a widget's metadata to the settings that actually influence what
 * it displays: cosmetic fields, empty values and explicit defaults are
 * dropped so that equivalent configurations compare equal.
 */
export function normalizeWidgetMeta(
  type: DashboardWidgetEntity['type'],
  meta: unknown,
): Record<string, unknown> {
  const defaults = WIDGET_META_DEFAULTS[type] ?? {};
  const source: Record<string, unknown> =
    meta && typeof meta === 'object' && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)
      : {};

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (COSMETIC_META_KEYS.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    if (key === 'conditions' && Array.isArray(value) && value.length === 0) {
      continue;
    }
    if (key === 'conditionsOp' && value === 'and') continue;
    if (
      key in defaults &&
      stableStringify(defaults[key]) === stableStringify(value)
    ) {
      continue;
    }
    normalized[key] = value;
  }
  return normalized;
}

/**
 * Whether two widgets show exactly the same information (same type and
 * equivalent settings), regardless of their name, size or position.
 */
export function isSameWidgetContent(
  a: WidgetContent,
  b: WidgetContent,
): boolean {
  if (a.type !== b.type) {
    return false;
  }
  return (
    stableStringify(normalizeWidgetMeta(a.type, a.meta)) ===
    stableStringify(normalizeWidgetMeta(b.type, b.meta))
  );
}

/**
 * Finds an existing widget that would be an exact duplicate of `candidate`.
 */
export function findDuplicateWidget<T extends WidgetContent>(
  widgets: readonly T[],
  candidate: WidgetContent,
): T | undefined {
  return widgets.find(widget => isSameWidgetContent(widget, candidate));
}
