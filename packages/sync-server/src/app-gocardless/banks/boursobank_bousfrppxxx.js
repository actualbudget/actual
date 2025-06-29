import { title } from '../../util/title/index.js';

import Fallback from './integration-bank.js';

const regexCard =
  /^CARTE (?<date>\d{2}\/\d{2}\/\d{2}) (?<payeeName>.+?)( \d+)?( CB\*\d{4})?$/;
const regexAtmWithdrawal =
  /^RETRAIT DAB (?<date>\d{2}\/\d{2}\/\d{2}) (?<locationName>.+?) CB\*\d{4,}/;
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
      // Remove the localisation with backslashes that are sometimes present
      transaction.remittanceInformationUnstructuredArray
        .map(line => line.replace(/\\.+/g, ''))
        // Remove an unwanted line that pollutes the remittance information
        .filter(line => line.startsWith('Réf : ') === false);

    const infoArray = editedTrans.remittanceInformationUnstructuredArray;
    const firstLine = infoArray[0];

    let match;

    /*
     * Some transactions always have their identifier in the first line (e.g. card),
     * while others have it **randomly** in any of the lines (e.g. transfers).
     */

    // Check the first line for specific patterns
    if ((match = firstLine.match(regexCard))) {
      // Card transaction
      const payeeName = match.groups.payeeName;
      editedTrans.payeeName = title(payeeName);
      editedTrans.notes = `Carte ${match.groups.date}`;
      if (infoArray.length > 1) {
        editedTrans.notes += ' ' + infoArray.slice(1).join(' ');
      }
    } else if ((match = firstLine.match(regexLoan))) {
      // Loan
      editedTrans.payeeName = 'Prêt bancaire';
      editedTrans.notes = firstLine;
    } else if ((match = firstLine.match(regexAtmWithdrawal))) {
      // ATM withdrawal
      editedTrans.payeeName = 'Retrait DAB';
      editedTrans.notes = `Retrait ${match.groups.date} ${match.groups.locationName}`;
      if (infoArray.length > 1) {
        editedTrans.notes += ' ' + infoArray.slice(1).join(' ');
      }
    } else if ((match = firstLine.match(regexCreditNote))) {
      // Credit note (refund)
      editedTrans.payeeName = title(match.groups.payeeName);
      editedTrans.notes = `Avoir ${match.groups.date}`;
    } else {
      // For the next patterns, we need to check all lines as the identifier can be anywhere
      if ((match = infoArray.find(line => regexInstantTransfer.test(line)))) {
        // Instant transfer
        editedTrans.payeeName = title(match.replace(regexInstantTransfer, ''));
        editedTrans.notes = infoArray.filter(l => l !== match).join(' ');
      } else if ((match = infoArray.find(line => regexSepa.test(line)))) {
        // SEPA transfer
        editedTrans.payeeName = title(match.replace(regexSepa, ''));
        editedTrans.notes = infoArray.filter(l => l !== match).join(' ');
      } else if ((match = infoArray.find(line => regexTransfer.test(line)))) {
        // Other transfer
        // Must be evaluated after the other transfers as they're more specific
        // (here VIR only)
        const infoArrayWithoutLine = infoArray.filter(l => l !== match);
        editedTrans.payeeName = title(infoArrayWithoutLine.join(' '));
        editedTrans.notes = match.replace(regexTransfer, '');
      } else {
        // Unknown transaction type
        editedTrans.payeeName = title(firstLine.replace(/ \d+$/, ''));
        editedTrans.notes = infoArray.slice(1).join(' ');
      }
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
