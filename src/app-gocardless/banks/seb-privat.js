import Fallback from './integration-bank.js';

import * as d from 'date-fns';
import { amountToInteger } from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SEB_ESSESESS_PRIVATE'],

  accessValidForDays: 180,

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
      // Creditor name is stored in additionInformation for SEB
      creditorName: transaction.additionalInformation,
      date: d.format(d.parseISO(date), 'yyyy-MM-dd'),
    };
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => 'interimBooked' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
