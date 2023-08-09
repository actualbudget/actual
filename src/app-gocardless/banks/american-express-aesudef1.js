import { amountToInteger, sortByBookingDateOrValueDate } from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: ['AMERICAN_EXPRESS_AESUDEF1'],

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      // The `iban` field for these American Express cards is actually a masked
      // version of the PAN.  No IBAN is provided.
      mask: account.iban.slice(-5),
      iban: null,
      name: [account.details, `(${account.iban.slice(-5)})`].join(' '),
      official_name: account.details,
      // The Actual account `type` field is legacy and is currently not used
      // for anything, so we leave it as the default of `checking`.
      type: 'checking',
    };
  },

  normalizeTransaction(transaction, _booked) {
    /**
     * The American Express Europe integration sends the actual date of
     * purchase as `bookingDate`, and `valueDate` appears to contain a date
     * related to the actual booking date, though sometimes offset by a day
     * compared to the American Express website.
     */
    delete transaction.valueDate;
    return transaction;
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
      (balance) => 'information' === balance.balanceType.toString(),
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
