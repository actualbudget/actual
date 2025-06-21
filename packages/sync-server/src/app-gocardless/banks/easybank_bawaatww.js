import { formatPayeeName } from '../../util/payee-name.js';
import { title } from '../../util/title/index.js';

import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['EASYBANK_BAWAATWW'],

  // If date is same, sort by transactionId
  sortTransactions: (transactions = []) =>
    transactions.sort((a, b) => {
      const diff =
        +new Date(b.valueDate || b.bookingDate) -
        +new Date(a.valueDate || a.bookingDate);
      if (diff !== 0) return diff;
      return parseInt(b.transactionId) - parseInt(a.transactionId);
    }),

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    let payeeName = formatPayeeName(transaction);
    if (!payeeName) payeeName = extractPayeeName(transaction);
    editedTrans.payeeName = payeeName;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};

/**
 * Extracts the payee name from the remittanceInformationStructured
 * @param {import('../gocardless-node.types.js').Transaction} transaction
 */
function extractPayeeName(transaction) {
  const structured = transaction.remittanceInformationStructured;
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
