import { title } from '../../util/title/index.js';

import Fallback from './integration-bank.js';

const regexCard =
  /^CARTE \d{2}\/\d{2}\/\d{2} (?<payeeName>.+?)( CB\*)?( ?\d{4,})?$/;
const regexAtmWithdrawal =
  /^RETRAIT DAB \d{2}\/\d{2}\/\d{2} (?<locationName>.+?) CB\*\d{4,}/;
const regexTransfer = /^VIR /;
const regexInstantTransfer = /^VIR INST /;
const regexSepa = /^(PRLV|VIR) SEPA /;
const regexLoan = /^ECH PRET:/;

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BOURSORAMA_BOUSFRPP'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.remittanceInformationUnstructuredArray =
      // Remove the backslashes that are sometimes present
      transaction.remittanceInformationUnstructuredArray
        .map(line => line.replace(/\\ ?/g, ' '))
        // Remove an unwanted line that pollutes the remittance information
        .filter(line => line.startsWith('Réf : ') === false);

    const infoArray = editedTrans.remittanceInformationUnstructuredArray;
    const firstLine = infoArray[0];

    if (firstLine.match(regexCard)) {
      // Card transaction
      const payeeName = firstLine.replace(regexCard, '$1');
      editedTrans.payeeName = title(payeeName);
    } else if (firstLine.match(regexInstantTransfer)) {
      // Instant transfer
      editedTrans.payeeName = title(
        firstLine.replace(regexInstantTransfer, ''),
      );
    } else if (firstLine.match(regexSepa)) {
      // SEPA transfer
      editedTrans.payeeName = title(firstLine.replace(regexSepa, ''));
    } else if (firstLine.match(regexTransfer) && infoArray.length > 1) {
      // Other transfer
      // Must be evaluated after the other transfers as they're more specific (here VIR only)
      editedTrans.payeeName = title(infoArray[1]);
      editedTrans.notes = firstLine.replace(regexTransfer, '');
    } else if (firstLine.match(regexLoan)) {
      // Loan
      editedTrans.payeeName = 'Prêt bancaire';
      editedTrans.notes = firstLine;
    } else if (firstLine.match(regexAtmWithdrawal)) {
      // ATM withdrawal
      editedTrans.payeeName = 'Retrait DAB';
      editedTrans.notes =
        firstLine.match(regexAtmWithdrawal).groups.locationName;
      if (infoArray.length > 1) {
        editedTrans.notes += ' ' + infoArray[1];
      }
    } else {
      editedTrans.payeeName = title(firstLine);
    }

    if (editedTrans.notes === undefined) {
      // We managed to extract the payee name, but nothing specific in the notes

      if (infoArray.length === 2) {
        // If there are only two lines, the second one is the notes
        editedTrans.notes = infoArray[1];
      } else {
        // Unfortunately, the order of the lines is not always the same, which causes issues on multiple syncs
        // Thus, do not set the notes if we have more than two lines
        editedTrans.notes = '';
      }
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
