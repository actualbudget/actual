export const getPageDocs = (page: string) => {
  switch (page) {
    case '/budget':
      return 'https://actualbudget.org/docs/getting-started/envelope-budgeting';
    case '/reports':
      return 'https://actualbudget.org/docs/reports/';
    case '/schedules':
      return 'https://actualbudget.org/docs/schedules';
    case '/payees':
      return 'https://actualbudget.org/docs/transactions/payees';
    case '/rules':
      return 'https://actualbudget.org/docs/budgeting/rules';
    case '/settings':
      return 'https://actualbudget.org/docs/settings';
    default:
      // All pages under /accounts, plus any missing pages
      return 'https://actualbudget.org/docs';
  }
};
