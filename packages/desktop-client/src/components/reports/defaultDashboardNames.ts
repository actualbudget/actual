type Translate = (key: string) => string;

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
