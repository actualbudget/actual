import {
  printIban,
  amountToInteger,
  sortByBookingDateOrValueDate,
} from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: ['SEB_KORT_AB_SE_SKHSFI21'],

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
   * Sign of transaction amount needs to be flipped for SEB credit cards
   */
  normalizeTransaction(transaction, _booked) {
    return {
      ...transaction,
      // Creditor name is stored in additionInformation for SEB
      creditorName: transaction.additionalInformation,
      date: transaction.valueDate,
      transactionAmount: {
        // Flip transaction amount sign
        amount: (-parseFloat(transaction.transactionAmount.amount)).toString(),
        currency: transaction.transactionAmount.currency,
      },
    };
  },

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
  },

  /**
   *  For SEB_KORT_AB_SE_SKHSFI21 we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `expected` balance type because it
   *  corresponds to the current running balance, whereas `interimAvailable`
   *  holds the remaining credit limit.
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => 'expected' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, -amountToInteger(currentBalance.balanceAmount.amount));
  },
};
