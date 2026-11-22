import type { NewDashboardWidgetEntity } from '@actual-app/core/types/models';
import type { TFunction } from 'i18next';

export function getDefaultDashboardState(
  t: TFunction,
): NewDashboardWidgetEntity[] {
  const yearToDate = {
    start: '2024-01-01',
    end: '2024-12-31',
    mode: 'yearToDate' as const,
  };
  const recentMonths = {
    start: '2024-01-01',
    end: '2024-03-31',
    mode: 'sliding-window' as const,
  };
  const onBudgetExpenses = [
    { field: 'amount' as const, op: 'lt' as const, value: 0 },
    { field: 'account' as const, op: 'onBudget' as const, value: '' },
    { field: 'transfer' as const, op: 'is' as const, value: false },
  ];

  return [
    {
      type: 'summary-card',
      width: 3,
      height: 2,
      x: 0,
      y: 0,
      meta: {
        name: t('Total Income (YTD)'),
        content: JSON.stringify({ type: 'sum', fontSize: 20 }),
        timeFrame: yearToDate,
        conditions: [
          { field: 'amount', op: 'gt', value: 0 },
          ...onBudgetExpenses.slice(1),
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
        name: t('Total Expenses (YTD)'),
        content: JSON.stringify({ type: 'sum', fontSize: 20 }),
        timeFrame: yearToDate,
        conditions: onBudgetExpenses,
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
        name: t('Avg Per Month'),
        content: JSON.stringify({ type: 'avgPerMonth', fontSize: 20 }),
        timeFrame: yearToDate,
        conditions: onBudgetExpenses,
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
        name: t('Avg Per Transaction'),
        content: JSON.stringify({ type: 'avgPerTransact', fontSize: 20 }),
        timeFrame: yearToDate,
        conditions: onBudgetExpenses,
        conditionsOp: 'and',
      },
    },
    { type: 'net-worth-card', width: 6, height: 2, x: 0, y: 2, meta: null },
    { type: 'cash-flow-card', width: 6, height: 2, x: 6, y: 2, meta: null },
    {
      type: 'spending-card',
      width: 4,
      height: 2,
      x: 0,
      y: 5,
      meta: { name: t('This Month'), mode: 'single-month' },
    },
    {
      type: 'spending-card',
      width: 4,
      height: 2,
      x: 4,
      y: 5,
      meta: { name: t('Budget Overview'), mode: 'budget' },
    },
    {
      type: 'spending-card',
      width: 4,
      height: 2,
      x: 8,
      y: 5,
      meta: { name: t('3-Month Average'), mode: 'average' },
    },
    {
      type: 'calendar-card',
      width: 8,
      height: 4,
      x: 0,
      y: 8,
      meta: {
        name: t('Transaction Calendar'),
        timeFrame: recentMonths,
        conditions: [{ field: 'transfer', op: 'is', value: false }],
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
        name: t('Recent Net Worth Change'),
        content: JSON.stringify({ type: 'sum', fontSize: 32 }),
        timeFrame: recentMonths,
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
        content: t(
          '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".',
        ),
      },
    },
  ];
}
