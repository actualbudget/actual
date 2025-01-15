import * as d from 'date-fns';
import {
  amountToInteger,
  printIban,
  sortByBookingDateOrValueDate,
} from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

const SORTED_BALANCE_TYPE_LIST = [
  'closingBooked',
  'expected',
  'forwardAvailable',
  'interimAvailable',
  'interimBooked',
  'nonInvoiced',
  'openingBooked',
];

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: ['IntegrationBank'],

  normalizeAccount(account) {
    console.debug(
      'Available account properties for new institution integration',
      { account: JSON.stringify(account) },
    );

    return {
      account_id: account.id,
      institution: account.institution,
      mask: (account?.iban || '0000').slice(-4),
      iban: account?.iban || null,
      name: [
        account.name ?? account.displayName ?? account.product,
        printIban(account),
        account.currency,
      ]
        .filter(Boolean)
        .join(' '),
      official_name: account.product ?? `integration-${account.institution_id}`,
      type: 'checking',
    };
  },

  normalizeTransaction(transaction, _booked) {
    const date =
      transaction.bookingDate ||
      transaction.bookingDateTime ||
      transaction.valueDate ||
      transaction.valueDateTime;
    // If we couldn't find a valid date field we filter out this transaction
    // and hope that we will import it again once the bank has processed the
    // transaction further.
    if (!date) {
      return null;
    }
    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: d.format(d.parseISO(date), 'yyyy-MM-dd'),
    };
  },

  sortTransactions(transactions = []) {
    console.debug(
      'Available (first 10) transactions properties for new integration of institution in sortTransactions function',
      { top10Transactions: JSON.stringify(transactions.slice(0, 10)) },
    );
    return sortByBookingDateOrValueDate(transactions);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    console.debug(
      'Available (first 10) transactions properties for new integration of institution in calculateStartingBalance function',
      {
        balances: JSON.stringify(balances),
        top10SortedTransactions: JSON.stringify(
          sortedTransactions.slice(0, 10),
        ),
      },
    );

    const currentBalance = balances
      .filter((item) => SORTED_BALANCE_TYPE_LIST.includes(item.balanceType))
      .sort(
        (a, b) =>
          SORTED_BALANCE_TYPE_LIST.indexOf(a.balanceType) -
          SORTED_BALANCE_TYPE_LIST.indexOf(b.balanceType),
      )[0];
    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance?.balanceAmount?.amount || 0));
  },
};
