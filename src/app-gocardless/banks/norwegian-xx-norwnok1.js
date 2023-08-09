import {
  printIban,
  amountToInteger,
  sortByBookingDateOrValueDate,
} from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: [
    'NORWEGIAN_NO_NORWNOK1',
    'NORWEGIAN_SE_NORWNOK1',
    'NORWEGIAN_DE_NORWNOK1',
    'NORWEGIAN_DK_NORWNOK1',
    'NORWEGIAN_ES_NORWNOK1',
    'NORWEGIAN_FI_NORWNOK1',
  ],

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

  normalizeTransaction(transaction, booked) {
    /**
     * The way Bank Norwegian handles the date fields is rather strange and
     * countrary to GoCardless's documentation.
     *
     * For booked transactions Bank Norwegian sends a `valueDate` field that
     * doesn't match the NextGenPSD2 definition of `valueDate` which is what we
     * expect to receive from GoCardless.  Therefore we remove the incorrect
     * field so that transactions are correctly imported.
     */
    if (booked) {
      delete transaction.valueDate;
      return transaction;
    }

    /**
     * For pending transactions there are two possibilities.  Either the
     * transaction has a `valueDate`, in which case the `valueDate` we receive
     * corresponds to when the transaction actually occurred, and so we simply
     * return the transaction as-is.
     */
    if (transaction.valueDate !== undefined) {
      return transaction;
    }

    /**
     * If the pending transaction didn't have a `valueDate` field then it
     * should have a `remittanceInformationStructured` field which contains the
     * date we expect to receive as the `valueDate`.  In this case we extract
     * the date from that field and set it as `valueDate`.
     */
    if (transaction.remittanceInformationStructured) {
      const remittanceInfoRegex = / (\d{4}-\d{2}-\d{2}) /;
      const matches =
        transaction.remittanceInformationStructured.match(remittanceInfoRegex);
      if (matches) {
        transaction.valueDate = matches[1];
        return transaction;
      }
    }

    /**
     * If neither pending case is true we return `null` and ignore the
     * transaction until it's been further processed by the bank.
     */
    return null;
  },

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
  },

  /**
   *  For NORWEGIAN_XX_NORWNOK1 we don't know what balance was
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
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
