import type { NewDashboardWidgetEntity } from '#types/models';

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
      builtin_key: 'total-income-ytd',
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
      builtin_key: 'total-expenses-ytd',
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
      builtin_key: 'average-per-month',
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
      builtin_key: 'average-per-transaction',
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
  // Second row: Net worth and cash flow side by side
  {
    type: 'net-worth-card',
    width: 6,
    height: 2,
    x: 0,
    y: 2,
    meta: null,
  },
  {
    type: 'cash-flow-card',
    width: 6,
    height: 2,
    x: 6,
    y: 2,
    meta: null,
  },
  // Third row: Spending comparisons
  {
    type: 'spending-card',
    width: 4,
    height: 2,
    x: 0,
    y: 5,
    meta: {
      name: 'This Month',
      builtin_key: 'this-month',
      mode: 'single-month',
    },
  },
  {
    type: 'spending-card',
    width: 4,
    height: 2,
    x: 4,
    y: 5,
    meta: {
      name: 'Budget Overview',
      builtin_key: 'budget-overview',
      mode: 'budget',
    },
  },
  {
    type: 'spending-card',
    width: 4,
    height: 2,
    x: 8,
    y: 5,
    meta: {
      name: '3-Month Average',
      builtin_key: 'three-month-average',
      mode: 'average',
    },
  },
  // Fourth row: Calendar and savings rate
  {
    type: 'calendar-card',
    width: 8,
    height: 4,
    x: 0,
    y: 8,
    meta: {
      name: 'Transaction Calendar',
      builtin_key: 'transaction-calendar',
      timeFrame: {
        start: '2024-01-01',
        end: '2024-03-31',
        mode: 'sliding-window',
      },
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
    y: 8,
    meta: {
      name: 'Recent Net Worth Change',
      builtin_key: 'recent-net-worth-change',
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
    y: 10,
    meta: {
      builtin_key: 'dashboard-tips',
      content:
        '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".',
    },
  },
];
