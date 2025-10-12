import { type NewWidget } from '../types/models';

export const DEFAULT_DASHBOARD_STATE: NewWidget[] = [
  // Top row: Key financial metrics
  {
    type: 'net-worth-card',
    width: 6,
    height: 2,
    x: 0,
    y: 0,
    meta: null,
  },
  {
    type: 'cash-flow-card',
    width: 6,
    height: 2,
    x: 6,
    y: 0,
    meta: null,
  },
  // Second row: Spending analysis and summary
  {
    type: 'spending-card',
    width: 6,
    height: 2,
    x: 0,
    y: 2,
    meta: null,
  },
  {
    type: 'summary-card',
    width: 3,
    height: 2,
    x: 6,
    y: 2,
    meta: {
      name: 'Monthly Income',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 24,
      }),
    },
  },
  {
    type: 'summary-card',
    width: 3,
    height: 2,
    x: 9,
    y: 2,
    meta: {
      name: 'Monthly Expenses',
      content: JSON.stringify({
        type: 'sum',
        fontSize: 24,
      }),
    },
  },
  // Third row: Calendar view for transaction patterns
  {
    type: 'calendar-card',
    width: 12,
    height: 3,
    x: 0,
    y: 4,
    meta: null,
  },
  // Fourth row: Welcome message and tips
  {
    type: 'markdown-card',
    width: 12,
    height: 2,
    x: 0,
    y: 7,
    meta: {
      content: `# Welcome to Your Financial Dashboard! 🎉

This dashboard gives you a complete view of your financial health. Here's what each widget shows:

- **Net Worth**: Your total assets minus liabilities over time
- **Cash Flow**: Income vs expenses for the current period  
- **Spending Analysis**: Your spending patterns and trends
- **Summary Cards**: Key monthly income and expense totals
- **Calendar**: Daily transaction activity and patterns

**Tip**: Click "Edit dashboard" to customize this layout or add more widgets!`,
      text_align: 'left',
    },
  },
];
