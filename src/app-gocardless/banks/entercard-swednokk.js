import * as d from 'date-fns';
import {
  amountToInteger,
  printIban,
  sortByBookingDateOrValueDate,
} from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: ['ENTERCARD_SWEDNOKK'],

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
    // GoCardless's Entercard integration returns forex transactions with the
    // foreign amount in `transactionAmount`, but at least the amount actually
    // billed to the account is now available in
    // `remittanceInformationUnstructured`.
    const remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured;
    if (remittanceInformationUnstructured.startsWith('billingAmount: ')) {
      transaction.transactionAmount = {
        amount: remittanceInformationUnstructured.substring(15),
        currency: 'SEK',
      };
    }

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: d.format(d.parseISO(transaction.valueDate), 'yyyy-MM-dd'),
    };
  },

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(balances[0]?.balanceAmount?.amount || 0));
  },
};
