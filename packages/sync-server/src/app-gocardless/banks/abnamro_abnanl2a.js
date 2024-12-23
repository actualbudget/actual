import Fallback from './integration-bank.js';
import { printIban, amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ABNAMRO_ABNANL2A'],

  accessValidForDays: 180,

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

  normalizeTransaction(transaction, _booked) {
    // There is no remittanceInformationUnstructured, so we'll make it
    let remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructuredArray.join(' ');

    // Remove clutter to extract the payee from remittanceInformationUnstructured ...
    // ... when not otherwise provided.
    const matches =
      remittanceInformationUnstructured.match(/Betaalpas(.+),PAS/);
    const payeeName = matches
      ? matches[1].replace(/.+\*/, '').trim()
      : undefined;
    transaction.debtorName = transaction.debtorName || payeeName;
    transaction.creditorName = transaction.creditorName || payeeName;

    // There are anumber of superfluous keywords in the remittanceInformation.
    // Remove them to aboid clutter in notes.
    const keywordsToRemove = ['.EA, Betaalpas', ',PAS\\d{3}', 'NR:.+, '];
    const regex = new RegExp(keywordsToRemove.join('|'), 'g');
    transaction.remittanceInformationUnstructured =
      remittanceInformationUnstructured.replace(regex, '').trim();

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.valueDateTime.slice(0, 10),
    };
  },

  sortTransactions(transactions = []) {
    return transactions.sort(
      (a, b) => +new Date(b.valueDateTime) - +new Date(a.valueDateTime),
    );
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    if (sortedTransactions.length) {
      const oldestTransaction =
        sortedTransactions[sortedTransactions.length - 1];
      const oldestKnownBalance = amountToInteger(
        oldestTransaction.balanceAfterTransaction.balanceAmount.amount,
      );
      const oldestTransactionAmount = amountToInteger(
        oldestTransaction.transactionAmount.amount,
      );

      return oldestKnownBalance - oldestTransactionAmount;
    } else {
      return amountToInteger(
        balances.find((balance) => 'interimBooked' === balance.balanceType)
          .balanceAmount.amount,
      );
    }
  },
};
