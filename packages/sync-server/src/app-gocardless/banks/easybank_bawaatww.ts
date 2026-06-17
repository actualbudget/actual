import type { Transaction } from '#app-gocardless/gocardless-node.types';
import { formatPayeeName } from '#util/payee-name';
import { title } from '#util/title';

import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['EASYBANK_BAWAATWW'],

  // If date is same, sort by transactionId
  sortTransactions: (transactions = []) =>
    transactions.sort((a, b) => {
      const diff =
        +new Date(b.valueDate || b.bookingDate || '') -
        +new Date(a.valueDate || a.bookingDate || '');
      if (diff !== 0) return diff;
      return parseInt(b.transactionId ?? '') - parseInt(a.transactionId ?? '');
    }),

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    let payeeName: string | undefined = formatPayeeName(transaction);

    // sometimes the creditor is not provided
    // the formatPayeeName then falls back to debtor
    // but that is not correct in case of a negative booking, as it is just the account holders IBAN.
    const creditorAccount =
      typeof transaction.creditorAccount === 'string'
        ? transaction.creditorAccount
        : transaction.creditorAccount?.iban;
    const hasCreditor = Boolean(transaction.creditorName || creditorAccount);
    const isInvalidFallback =
      Number(transaction.transactionAmount.amount) < 0 && !hasCreditor;

    if (!payeeName || isInvalidFallback) {
      payeeName = extractPayeeName(transaction);
    }
    editedTrans.payeeName = payeeName;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;

// extracts the payee name from the remittanceInformationStructured
function extractPayeeName(transaction: Transaction) {
  const structured = transaction.remittanceInformationStructured ?? '';
  // The payee name is betweeen the transaction timestamp (11.07. 11:36) and the location, that starts with \\
  const regex = /\d{2}\.\d{2}\. \d{2}:\d{2}(.*)\\\\/;
  const matches = structured.match(regex);
  if (matches && matches.length > 1 && matches[1]) {
    return title(matches[1]);
  } else {
    // As a fallback if still no payee is found, the whole information is used
    return structured;
  }
}
