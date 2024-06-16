import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['NATIONWIDE_NAIAGB21'],

  accessValidForDays: 90,

  normalizeTransaction(transaction, booked) {
    // Nationwide returns pending transactions with a date representing
    // the latest a transaction could be booked. This stops actual's
    // deduplication logic from working as it only checks 7 days ahead/behind
    // and the transactionID from Nationwide changes when a transaction is
    // booked
    if (!booked) {
      const d = new Date(transaction.bookingDate);
      d.setDate(d.getDate() - 8);

      const useDate = new Date(Math.min(d.getTime(), new Date().getTime()));

      transaction.bookingDate = useDate.toISOString().slice(0, 10);
    }

    console.log(transaction);

    // Nationwide also occasionally returns erroneous transaction_ids
    // that are malformed and can even change after import. This will ignore
    // these ids and unset them. When a correct ID is returned then it will
    // update via the deduplication logic
    const debitCreditRegex = /^00(DEB|CRED)IT.+$/;
    const validLengths = [
      40, // Nationwide credit cards
      32, // Nationwide current accounts
    ];

    if (
      transaction.transactionId?.match(debitCreditRegex) ||
      !validLengths.includes(transaction.transactionId?.length)
    ) {
      transaction.transactionId = null;
    }

    return Fallback.normalizeTransaction(transaction, booked);
  },
};
