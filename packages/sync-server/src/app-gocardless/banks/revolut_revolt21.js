import { formatPayeeName } from '../../util/payee-name.js';
import * as d from 'date-fns';
import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['REVOLUT_REVOLT21'],

  normalizeTransaction(transaction, _booked) {
    if (
      transaction.remittanceInformationUnstructuredArray[0].startsWith(
        'Bizum payment from: ',
      )
    ) {
      const date =
        transaction.bookingDate ||
        transaction.bookingDateTime ||
        transaction.valueDate ||
        transaction.valueDateTime;

      return {
        ...transaction,
        payeeName:
          transaction.remittanceInformationUnstructuredArray[0].replace(
            'Bizum payment from: ',
            '',
          ),
        remittanceInformationUnstructured:
          transaction.remittanceInformationUnstructuredArray[1],
        date: d.format(d.parseISO(date), 'yyyy-MM-dd'),
      };
    }

    if (
      transaction.remittanceInformationUnstructuredArray[0].startsWith(
        'Bizum payment to: ',
      )
    ) {
      const date =
        transaction.bookingDate ||
        transaction.bookingDateTime ||
        transaction.valueDate ||
        transaction.valueDateTime;

      return {
        ...transaction,
        payeeName: formatPayeeName(transaction),
        remittanceInformationUnstructured:
          transaction.remittanceInformationUnstructuredArray[1],
        date: d.format(d.parseISO(date), 'yyyy-MM-dd'),
      };
    }

    return Fallback.normalizeTransaction(transaction, _booked);
  },
};
