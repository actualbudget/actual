import { type NewWidget } from '../types/models';

// Monthly view - Custom widgets for monthly overview
export const MONTHLY_DASHBOARD_STATE: NewWidget[] = [
  // Top row: Key metrics at a glance (5 cards - adjusted widths to fit)
  {
    type: 'summary-card',
    width: 3,
    height: 2,
    x: 0,
    y: 0,
    meta: {
      name: 'Total Income',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 7,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'lastMonth',
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
        {
          // Exclude starting balance transactions by category
          field: 'category',
          op: 'doesNotContain',
          value: 'Starting Balances',
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
      name: 'Total Expenses',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 7,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'lastMonth',
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
    width: 2,
    height: 2,
    x: 6,
    y: 0,
    meta: {
      name: 'Net Savings',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 12,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'lastMonth',
      },
      conditions: [
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
    width: 2,
    height: 2,
    x: 8,
    y: 0,
    meta: {
      name: 'Avg Per Day',
      content: JSON.stringify({
        type: 'avgPerDay',
        fontSize: 12,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'lastMonth',
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
    width: 2,
    height: 2,
    x: 10,
    y: 0,
    meta: {
      name: 'Avg Per Transaction',
      content: JSON.stringify({
        type: 'avgPerTransact',
        fontSize: 12,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'lastMonth',
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
    height: 3,
    x: 0,
    y: 2,
    meta: {
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'sliding-window',
      },
    },
  },
  {
    type: 'cash-flow-card',
    width: 6,
    height: 3,
    x: 6,
    y: 2,
    meta: {
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'lastMonth',
      },
    },
  },
  // Third row: Category-wise spending breakdown with pie chart
  {
    type: 'category-spending-card',
    width: 12,
    height: 5,
    x: 0,
    y: 5,
    meta: {
      name: 'Spending by Category',
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'lastMonth',
      },
    },
  },
];

// Yearly/Default view - Original ActualBudget dashboard
export const YEARLY_DASHBOARD_STATE: NewWidget[] = [
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
        fontSize: 10,
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
        fontSize: 8,
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
        fontSize: 10,
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
        fontSize: 10,
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
    y: 4,
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
    y: 4,
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
    y: 4,
    meta: {
      name: '3-Month Average',
      mode: 'average',
    },
  },
  // Fourth row: Net worth change and tips
  {
    type: 'summary-card',
    width: 6,
    height: 3,
    x: 0,
    y: 6,
    meta: {
      name: 'Net Worth Change (YTD)',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 20,
      }),
      timeFrame: {
        start: '2024-01-01',
        end: '2024-12-31',
        mode: 'yearToDate',
      },
      conditions: [],
      conditionsOp: 'and',
    },
  },
  {
    type: 'markdown-card',
    width: 6,
    height: 3,
    x: 6,
    y: 6,
    meta: {
      content:
        '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".\n\n**View Modes:** Switch between Monthly and Yearly views using the buttons at the top.',
    },
  },
];

// Default dashboard state - Original ActualBudget dashboard
export const DEFAULT_DASHBOARD_STATE: NewWidget[] = [
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
      content:
        '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".',
    },
  },
];
