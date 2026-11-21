import type { BuiltinDashboardWidgetKey } from '@actual-app/core/types/models';

type Translate = (key: string) => string;

// The key is persisted only for seeded widgets. A title is user data, so it
// must never be used to decide whether a translation applies.
export function translateBuiltInDashboardName(
  name: string,
  builtinKey: BuiltinDashboardWidgetKey | undefined,
  t: Translate,
) {
  switch (builtinKey) {
    case 'total-income-ytd':
      return t('Total Income (YTD)');
    case 'total-expenses-ytd':
      return t('Total Expenses (YTD)');
    case 'average-per-month':
      return t('Avg Per Month');
    case 'average-per-transaction':
      return t('Avg Per Transaction');
    case 'this-month':
      return t('This Month');
    case 'budget-overview':
      return t('Budget Overview');
    case 'three-month-average':
      return t('3-Month Average');
    case 'transaction-calendar':
      return t('Transaction Calendar');
    case 'recent-net-worth-change':
      return t('Recent Net Worth Change');
    default:
      return name;
  }
}

export function translateBuiltInDashboardPageName(
  name: string,
  builtinKey: 'main' | undefined,
  t: Translate,
) {
  return builtinKey === 'main' ? t('Main') : name;
}

export function translateBuiltInDashboardContent(
  content: string,
  builtinKey: BuiltinDashboardWidgetKey | undefined,
  t: Translate,
) {
  if (builtinKey === 'dashboard-tips') {
    return t(
      '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".',
    );
  }

  return content;
}
