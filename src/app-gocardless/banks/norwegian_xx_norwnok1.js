import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: [
    'NORWEGIAN_NO_NORWNOK1',
    'NORWEGIAN_SE_NORWNOK1',
    'NORWEGIAN_DE_NORWNOK1',
    'NORWEGIAN_DK_NORWNOK1',
    'NORWEGIAN_ES_NORWNOK1',
    'NORWEGIAN_FI_NORWNOK1',
  ],

  normalizeTransaction(transaction, booked) {
    if (booked) {
      return {
        ...transaction,
        payeeName: formatPayeeName(transaction),
        date: transaction.bookingDate,
      };
    }

    /**
     * For pending transactions there are two possibilities:
     *
     * - Either a `valueDate` was set, in which case it corresponds to when the
     *   transaction actually occurred, or
     * - There is no date field, in which case we try to parse the correct date
     *   out of the `remittanceInformationStructured` field.
     *
     * If neither case succeeds then we return `null` causing this transaction
     * to be filtered out for now, and hopefully we'll be able to import it
     * once the bank has processed it further.
     */
    if (transaction.valueDate !== undefined) {
      return {
        ...transaction,
        payeeName: formatPayeeName(transaction),
        date: transaction.valueDate,
      };
    }

    if (transaction.remittanceInformationStructured) {
      const remittanceInfoRegex = / (\d{4}-\d{2}-\d{2}) /;
      const matches =
        transaction.remittanceInformationStructured.match(remittanceInfoRegex);
      if (matches) {
        transaction.valueDate = matches[1];
        return {
          ...transaction,
          payeeName: formatPayeeName(transaction),
          date: matches[1],
        };
      }
    }

    return null;
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
