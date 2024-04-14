import * as d from 'date-fns';
import {
  sortByBookingDateOrValueDate,
  amountToInteger,
  printIban,
} from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: ['SEB_ESSESESS_PRIVATE'],

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

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
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
