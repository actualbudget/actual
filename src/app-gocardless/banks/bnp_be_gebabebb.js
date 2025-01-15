import Fallback from './integration-bank.js';

import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: [
    'FINTRO_BE_GEBABEBB',
    'HELLO_BE_GEBABEBB',
    'BNP_BE_GEBABEBB',
  ],

  /** BNP_BE_GEBABEBB provides a lot of useful information via the 'additionalField'
   *  There does not seem to be a specification of this field, but the following information is contained in its subfields:
   *  - for pending transactions: the 'atmPosName'
   *  - for booked transactions: the 'narrative'.
   *  This narrative subfield is most useful as it contains information required to identify the transaction,
   *  especially in case of debit card or instant payment transactions.
   *  Do note that the narrative subfield ALSO contains the remittance information if any.
   *  The goal of the  normalization is to place any relevant information of the additionalInformation
   *  field in the remittanceInformationUnstructuredArray field.
   */
  normalizeTransaction(transaction, _booked) {
    // Extract the creditor name to fill it in with information from the
    // additionalInformation field in case it's not yet defined.
    let creditorName = transaction.creditorName;

    if (transaction.additionalInformation) {
      let additionalInformationObject = {};
      const additionalInfoRegex = /(, )?([^:]+): ((\[.*?\])|([^,]*))/g;
      let matches =
        transaction.additionalInformation.matchAll(additionalInfoRegex);
      if (matches) {
        let creditorNameFromNarrative; // Possible value for creditorName
        for (let match of matches) {
          let key = match[2].trim();
          let value = (match[4] || match[5]).trim();
          if (key === 'narrative') {
            // Set narrativeName to the first element in the "narrative" array.
            let first_value = value.matchAll(/'(.+?)'/g)?.next().value;
            creditorNameFromNarrative = first_value
              ? first_value[1].trim()
              : undefined;
          }
          // Remove square brackets and single quotes and commas
          value = value.replace(/[[\]',]/g, '');
          additionalInformationObject[key] = value;
        }
        // Keep existing unstructuredArray and add atmPosName and narrative
        transaction.remittanceInformationUnstructuredArray = [
          transaction.remittanceInformationUnstructuredArray ?? '',
          additionalInformationObject?.atmPosName ?? '',
          additionalInformationObject?.narrative ?? '',
        ].filter(Boolean);

        // If the creditor name doesn't exist in the original transactions,
        // set it to the atmPosName or narrativeName if they exist; otherwise
        // leave empty and let the default rules handle it.
        creditorName =
          creditorName ??
          additionalInformationObject?.atmPosName ??
          creditorNameFromNarrative ??
          null;
      }
    }

    transaction.creditorName = creditorName;

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.valueDate || transaction.bookingDate,
    };
  },
};
