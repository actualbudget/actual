import * as d from 'date-fns';

import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SWEDBANK_HABALV22'],

  /**
   * The actual transaction date for card transactions is only available in the remittanceInformationUnstructured field when the transaction is booked.
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const isCardTransaction =
      transaction.remittanceInformationUnstructured?.startsWith('PIRKUMS');

    if (isCardTransaction) {
      if (!booked && !transaction.creditorName) {
        const creditorNameMatch =
          transaction.remittanceInformationUnstructured?.match(
            /PIRKUMS [\d*]+ \d{2}\.\d{2}\.\d{2} \d{2}:\d{2} [\d.]+ \w{3} \(\d+\) (.+)/,
          );

        if (creditorNameMatch) {
          editedTrans.creditorName = creditorNameMatch[1];
        }
      }

      const dateMatch = transaction.remittanceInformationUnstructured?.match(
        /PIRKUMS [\d*]+ (\d{2}\.\d{2}\.\d{4})/,
      );

      if (dateMatch) {
        const extractedDate = d
          .parse(dateMatch[1], 'dd.MM.yyyy', new Date())
          .toISOString();

        editedTrans.date = extractedDate;
      }
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
