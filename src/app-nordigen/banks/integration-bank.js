import { sortByBookingDate } from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionId: 'IntegrationBank',
  normalizeAccount(account) {
    console.log(
      'Available account properties for new institution integration',
      { account: JSON.stringify(account) }
    );

    return {
      account_id: account.id,
      institution: account.institution,
      mask: (account?.iban || '0000').slice(-4),
      name: `integration-${account.institution_id}`,
      official_name: `integration-${account.institution_id}`,
      type: 'checking'
    };
  },
  sortTransactions(transactions = []) {
    console.log(
      'Available (first 10) transactions properties for new integration of institution in sortTransactions function',
      { top10Transactions: JSON.stringify(transactions.slice(0, 10)) }
    );
    return sortByBookingDate(transactions);
  },
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    console.log(
      'Available (first 10) transactions properties for new integration of institution in calculateStartingBalance function',
      {
        balances: JSON.stringify(balances),
        top10SortedTransactions: JSON.stringify(sortedTransactions.slice(0, 10))
      }
    );
    return 0;
  }
};
