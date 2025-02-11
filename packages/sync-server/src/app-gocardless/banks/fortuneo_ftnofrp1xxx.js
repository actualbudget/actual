import { formatPayeeName } from '../../util/payee-name.js';
import Fallback from './integration-bank.js';
import * as d from 'date-fns';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['FORTUNEO_FTNOFRP1XXX'],

  normalizeTransaction(transaction, _booked) {
    const date =
      transaction.bookingDate ||
      transaction.bookingDateTime ||
      transaction.valueDate ||
      transaction.valueDateTime;
    // If we couldn't find a valid date field we filter out this transaction
    // and hope that we will import it again once the bank has processed the
    // transaction further.
    if (!date) {
      return null;
    }

    // Most of the information from the transaction is in the remittanceInformationUnstructuredArray field.
    // We extract the creditor and debtor names from this field.
    // The remittanceInformationUnstructuredArray field usually contain keywords like "Vir" for
    // bank transfers or "Carte 03/06" for card payments, as well as the date.
    // We remove these keywords to get a cleaner payee name.
    const keywordsToRemove = [
      'VIR INST',
      'VIR',
      'PRLV',
      'ANN CARTE',
      'CARTE \\d{2}\\/\\d{2}',
    ];

    const details =
      transaction.remittanceInformationUnstructuredArray.join(' ');
    const amount = transaction.transactionAmount.amount;

    const regex = new RegExp(keywordsToRemove.join('|'), 'g');
    const payeeName = details.replace(regex, '').trim();

    // The amount is negative for outgoing transactions, positive for incoming transactions.
    const isCreditorPayee = parseFloat(amount) < 0;

    // The payee name is the creditor name for outgoing transactions and the debtor name for incoming transactions.
    const creditorName = isCreditorPayee ? payeeName : null;
    const debtorName = isCreditorPayee ? null : payeeName;

    transaction.creditorName = creditorName;
    transaction.debtorName = debtorName;

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: d.format(d.parseISO(date), 'yyyy-MM-dd'),
    };
  },
};
