import {
  sortByBookingDateOrValueDate,
  amountToInteger,
  printIban,
} from '../utils.js';

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
  institutionIds: [
    'SPARNORD_SPNODK22',
    'LAGERNES_BANK_LAPNDKK1',
    'ANDELSKASSEN_FALLESKASSEN_FAELDKK1',
  ],

  accessValidForDays: 180,

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      mask: (account?.iban || '0000').slice(-4),
      iban: account?.iban || null,
      name: [account.name, printIban(account), account.currency]
        .filter(Boolean)
        .join(' '),
      official_name: `integration-${account.institution_id}`,
      type: 'checking',
    };
  },

  /**
   * Banks on the BEC backend only give information regarding the transaction in additionalInformation
   */
  normalizeTransaction(transaction, _booked) {
    return {
      ...transaction,
      date: transaction.bookingDate,
      remittanceInformationUnstructured: transaction.additionalInformation,
    };
  },

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
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
