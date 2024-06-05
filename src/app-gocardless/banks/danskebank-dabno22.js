import Fallback from './integration-bank.js';

import { printIban, amountToInteger } from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['DANSKEBANK_DABANO22'],

  accessValidForDays: 180,

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      mask: account.iban.slice(-4),
      iban: account.iban,
      name: [account.name, printIban(account)].join(' '),
      official_name: account.name,
      type: 'checking',
    };
  },

  normalizeTransaction(transaction, _booked) {
    /**
     * Danske Bank appends the EndToEndID: NOTPROVIDED to
     * remittanceInformationUnstructured, cluttering the data.
     *
     * We clean thais up by removing any instances of this string from all transactions.
     *
     */
    transaction.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured.replace(
        '\nEndToEndID: NOTPROVIDED',
        '',
      );

    /**
     * The valueDate in transactions from Danske Bank is not the one expected, but rather the date
     * the funds are expected to be paid back for credit accounts.
     */
    return {
      ...transaction,
      date: transaction.bookingDate,
    };
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => balance.balanceType === 'interimAvailable',
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
