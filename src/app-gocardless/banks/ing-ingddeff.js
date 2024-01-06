import { printIban, amountToInteger } from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: ['ING_INGDDEFF'],

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      mask: account.iban.slice(-4),
      iban: account.iban,
      name: [account.product, printIban(account)].join(' '),
      official_name: account.product,
      type: 'checking',
    };
  },

  normalizeTransaction(transaction, _booked) {
    const remittanceInformationMatch = /remittanceinformation:(.*)$/.exec(
      transaction.remittanceInformationUnstructured,
    );
    const remittanceInformation = remittanceInformationMatch
      ? remittanceInformationMatch[1]
      : transaction.remittanceInformationUnstructured;

    return {
      ...transaction,
      remittanceInformationUnstructured: remittanceInformation,
      date: transaction.bookingDate || transaction.valueDate,
    };
  },

  sortTransactions(transactions = []) {
    return transactions.sort((a, b) => {
      const diff =
        +new Date(b.valueDate || b.bookingDate) -
        +new Date(a.valueDate || a.bookingDate);
      if (diff) return diff;
      const idA = parseInt(a.transactionId);
      const idB = parseInt(b.transactionId);
      if (!isNaN(idA) && !isNaN(idB)) return idB - idA;
      return 0;
    });
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
