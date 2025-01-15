import Fallback from './integration-bank.js';

import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['HYPE_HYEEIT22'],

  normalizeTransaction(transaction, _booked) {
    /** Online card payments - identified by "crd" transaction code
     *  always start with PAGAMENTO PRESSO + <payee name>
     */
    if (transaction.proprietaryBankTransactionCode == 'crd') {
      // remove PAGAMENTO PRESSO and set payee name
      transaction.debtorName =
        transaction.remittanceInformationUnstructured?.slice(
          'PAGAMENTO PRESSO '.length,
        );
    }
    /**
     * In-app money transfers (p2p) and bank transfers (bon) have remittance info structure like
     * DENARO (INVIATO/RICEVUTO) (A/DA) {payee_name} - {payment_info} (p2p)
     * HAI (INVIATO/RICEVUTO) UN BONIFICO (A/DA) {payee_name} - {payment_info} (bon)
     */
    if (
      transaction.proprietaryBankTransactionCode == 'p2p' ||
      transaction.proprietaryBankTransactionCode == 'bon'
    ) {
      // keep only {payment_info} portion of remittance info
      // NOTE: if {payee_name} contains dashes (unlikely / impossible?), this probably gets bugged!
      let infoIdx =
        transaction.remittanceInformationUnstructured.indexOf(' - ') + 3;
      transaction.remittanceInformationUnstructured =
        infoIdx == -1
          ? transaction.remittanceInformationUnstructured
          : transaction.remittanceInformationUnstructured.slice(infoIdx).trim();
    }
    /**
     * CONVERT ESCAPED UNICODE TO CODEPOINTS
     * p2p payments allow user to write arbitrary unicode strings as messages
     * gocardless reports unicode codepoints as \Uxxxx
     * so it groups them in 4bytes bundles
     * the code below assumes this is always the case
     */
    if (transaction.proprietaryBankTransactionCode == 'p2p') {
      let str = transaction.remittanceInformationUnstructured;
      let idx = str.indexOf('\\U');
      let start_idx = idx;
      let codepoints = [];
      while (idx !== -1) {
        codepoints.push(parseInt(str.slice(idx + 2, idx + 6), 16));
        let next_idx = str.indexOf('\\U', idx + 6);
        if (next_idx == idx + 6) {
          idx = next_idx;
          continue;
        }
        str =
          str.slice(0, start_idx) +
          String.fromCodePoint(...codepoints) +
          str.slice(idx + 6);
        codepoints = [];
        idx = str.indexOf('\\U'); // slight inefficiency?
        start_idx = idx;
      }
      transaction.remittanceInformationUnstructured = str;
    }
    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.valueDate || transaction.bookingDate,
    };
  },
};
