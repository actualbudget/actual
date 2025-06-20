import { title } from '../../util/title/index.js';

import Fallback from './integration-bank.js';

const regexCard =
  /^CARTE \d{2}\/\d{2}\/\d{2} (?<payeeName>.+?)( \d+)?( CB\*\d{4})?$/;
const regexAtmWithdrawal =
  /^RETRAIT DAB \d{2}\/\d{2}\/\d{2} (?<locationName>.+?) CB\*\d{4,}/;
const regexTransfer = /^VIR /;
const regexInstantTransfer = /^VIR INST /;
const regexSepa = /^(PRLV|VIR) SEPA /;
const regexLoan = /^ECH PRET:/;
const regexCreditNote =
  /^AVOIR (?<date>\d{2}\/\d{2}\/\d{2}) (?<payeeName>.+?) CB\*\d{4,}/;

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

    /*
     * Some transactions always have their identifier in the first line (e.g. card),
     * while others have it **randomly** in any of the lines (e.g. transfers).
     */

    // Check the first line for specific patterns
    if (firstLine.match(regexCard)) {
      // Card transaction
      const payeeName = firstLine.replace(regexCard, '$1');
      editedTrans.payeeName = title(payeeName);
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
    } else if (firstLine.match(regexCreditNote)) {
      // Credit note (refund)
      const match = firstLine.match(regexCreditNote);
      editedTrans.payeeName = title(match.groups.payeeName);
      editedTrans.notes = `Avoir ${match.groups.date}`;
    } else {
      // For the next patterns, we need to check all lines as the identifier can be anywhere
      let identified = false;

      // Instant transfer
      for (let line of infoArray) {
        if (line.match(regexInstantTransfer)) {
          editedTrans.payeeName = title(line.replace(regexInstantTransfer, ''));
          editedTrans.notes = infoArray.filter(l => l !== line).join(' ');
          identified = true;
          break;
        }
      }

      // SEPA transfer
      if (!identified) {
        for (let line of infoArray) {
          if (line.match(regexSepa)) {
            editedTrans.payeeName = title(line.replace(regexSepa, ''));
            editedTrans.notes = infoArray.filter(l => l !== line).join(' ');
            identified = true;
            break;
          }
        }
      }

      // Other transfer
      // Must be evaluated after the other transfers as they're more specific (here VIR only)
      if (!identified) {
        for (let line of infoArray) {
          if (line.match(regexTransfer)) {
            const infoArrayWithoutLine = infoArray.filter(l => l !== line);
            editedTrans.payeeName = title(infoArrayWithoutLine.join(' '));
            editedTrans.notes = line.replace(regexTransfer, '');
            identified = true;
            break;
          }
        }
      }

      if (!identified) {
        // Unknown transaction type
        editedTrans.payeeName = title(firstLine.replace(/ \d+$/, ''));
      }
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
