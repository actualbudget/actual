import d from 'date-fns';

import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SWEDBANK_HABALV22'],

  accessValidForDays: 90,

  /**
   * The actual transaction date for card transactions is only available in the remittanceInformationUnstructured field when the transaction is booked.
   */
  normalizeTransaction(transaction, booked) {
    const dateMatch = transaction.remittanceInformationUnstructured?.match(
      /PIRKUMS [\d*]+ (\d{2}.\d{2}.\d{4})/,
    );

    if (dateMatch) {
      const extractedDate = d.parse(dateMatch[1], 'dd.MM.yyyy', new Date());

      return Fallback.normalizeTransaction(
        { ...transaction, bookingDate: d.format(extractedDate, 'yyyy-MM-dd') },
        booked,
      );
    }

    return Fallback.normalizeTransaction(transaction, booked);
  },
};
