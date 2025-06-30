import { formatPayeeName } from '../../util/payee-name.js';
import { title } from '../../util/title/index.js';

import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['RAIFFEISEN_AT_RZBAATWW'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    let payeeName = formatPayeeName(transaction);
    if (!payeeName) {
      payeeName = extractPayeeName(transaction);
    }
    editedTrans.payeeName = payeeName;

    // avoid empty notes if payee is set but no information in unstructured information
    // if no structured or unstructured information is provided, return the endToEndId instead
    editedTrans.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured ??
      transaction.endToEndId;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};

/**
 * Extracts the payee name from the remittanceInformationStructured
 * @param {import('../gocardless-node.types.js').Transaction} transaction
 */
function extractPayeeName(transaction) {
  const structured = transaction.remittanceInformationStructured;
  // The payee name is at the beginning and has a max length of 12 characters
  // (if structured information is actually structured ...).
  const regex = /(.{12}) \d{4} .* \d{2}\.\d{2}\. \d{2}:\d{2}/;
  const matches = structured.match(regex);
  if (matches && matches.length > 1 && matches[1]) {
    const name = title(matches[1]);
    // These transactions never contained creditor information in my tests, thus no
    // attempt to add the IBAN to the name...
    return name;
  } else {
    // As a fallback if still no payee is found, the whole information is used
    return structured;
  }
}
