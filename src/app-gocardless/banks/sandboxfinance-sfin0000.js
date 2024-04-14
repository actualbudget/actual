import {
  printIban,
  amountToInteger,
  sortByBookingDateOrValueDate,
} from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: ['SANDBOXFINANCE_SFIN0000'],

  accessValidForDays: 90,

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      mask: account.iban.slice(-4),
      iban: account.iban,
      name: [account.name, printIban(account)].join(' '),
      official_name: account.product,
      type: 'checking',
    };
  },

  /**
   * Following the GoCardless documentation[0] we should prefer `bookingDate`
   * here, though some of their bank integrations uses the date field
   * differently from what's describen in their documentation and so it's
   * sometimes necessary to use `valueDate` instead.
   *
   *   [0]: https://nordigen.zendesk.com/hc/en-gb/articles/7899367372829-valueDate-and-bookingDate-for-transactions
   */
  normalizeTransaction(transaction, _booked) {
    return {
      ...transaction,
      date: transaction.bookingDate || transaction.valueDate,
    };
  },

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
  },

  /**
   *  For SANDBOXFINANCE_SFIN0000 we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `interimBooked` balance type because
   *  it includes transaction placed during current day
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => 'interimAvailable' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
