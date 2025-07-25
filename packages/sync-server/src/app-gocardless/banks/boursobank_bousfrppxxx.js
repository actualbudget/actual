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

    let match;

    // Transactions can have their identifier in any line, as the order of lines is not guaranteed.
    // This is why we check all lines for specific patterns.
    if ((match = infoArray.find(line => regexCard.test(line)))) {
      // Card transaction
      const cardMatch = match.match(regexCard);
      editedTrans.payeeName = title(cardMatch.groups.payeeName);
      editedTrans.notes = `Carte ${cardMatch.groups.date}`;
      if (infoArray.length > 1) {
        editedTrans.notes += ' ' + infoArray.filter(l => l !== match).join(' ');
      }
    } else if ((match = infoArray.find(line => regexLoan.test(line)))) {
      // Loan
      editedTrans.payeeName = 'Prêt bancaire';
      editedTrans.notes = match;
    } else if (
      (match = infoArray.find(line => regexAtmWithdrawal.test(line)))
    ) {
      // ATM withdrawal
      const atmMatch = match.match(regexAtmWithdrawal);
      editedTrans.payeeName = 'Retrait DAB';
      editedTrans.notes = `Retrait ${atmMatch.groups.date} ${atmMatch.groups.locationName}`;
      if (infoArray.length > 1) {
        editedTrans.notes += ' ' + infoArray.filter(l => l !== match).join(' ');
      }
    } else if ((match = infoArray.find(line => regexCreditNote.test(line)))) {
      // Credit note (refund)
      const creditMatch = match.match(regexCreditNote);
      editedTrans.payeeName = title(creditMatch.groups.payeeName);
      editedTrans.notes = `Avoir ${creditMatch.groups.date}`;
      if (infoArray.length > 1) {
        editedTrans.notes += ' ' + infoArray.filter(l => l !== match).join(' ');
      }
    } else if (
      (match = infoArray.find(line => regexInstantTransfer.test(line)))
    ) {
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
      editedTrans.payeeName = title(infoArray[0].replace(/ \d+$/, ''));
      editedTrans.notes = infoArray.slice(1).join(' ');
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
