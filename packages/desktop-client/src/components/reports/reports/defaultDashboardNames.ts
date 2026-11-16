type Translate = (key: string) => string;

const DEFAULT_DASHBOARD_TIPS =
  '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".';

// These names are seeded by the server for the built-in dashboard. Translate
// only this fixed set so user-provided report names remain user data.
export function translateBuiltInDashboardName(name: string, t: Translate) {
  switch (name) {
    case 'Main':
      return t('Main');
    case 'Total Income (YTD)':
      return t('Total Income (YTD)');
    case 'Total Expenses (YTD)':
      return t('Total Expenses (YTD)');
    case 'Avg Per Month':
      return t('Avg Per Month');
    case 'Avg Per Transaction':
      return t('Avg Per Transaction');
    case 'This Month':
      return t('This Month');
    case 'Budget Overview':
      return t('Budget Overview');
    case '3-Month Average':
      return t('3-Month Average');
    case 'Transaction Calendar':
      return t('Transaction Calendar');
    case 'Recent Net Worth Change':
      return t('Recent Net Worth Change');
    default:
      return name;
  }
}

export function translateBuiltInDashboardContent(
  content: string,
  t: Translate,
) {
  if (content === DEFAULT_DASHBOARD_TIPS) {
    return t(
      '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".',
    );
  }

  return content;
}
