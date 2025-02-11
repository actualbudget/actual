import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BANK_OF_IRELAND_B365_BOFIIE2D'],

  normalizeTransaction(transaction, booked) {
    transaction.remittanceInformationUnstructured = fixupPayee(
      transaction.remittanceInformationUnstructured,
    );

    return Fallback.normalizeTransaction(transaction, booked);
  },
};

function fixupPayee(/** @type {string} */ payee) {
  let fixedPayee = payee;

  // remove all duplicate whitespace
  fixedPayee = fixedPayee.replace(/\s+/g, ' ').trim();

  // remove date prefix
  fixedPayee = fixedPayee.replace(/^(POS)?(C)?[0-9]{1,2}\w{3}/, '').trim();

  // remove direct debit postfix
  fixedPayee = fixedPayee.replace(/sepa dd$/i, '').trim();

  // remove bank transfer prefix
  fixedPayee = fixedPayee.replace(/^365 online/i, '').trim();

  // remove curve card prefix
  fixedPayee = fixedPayee.replace(/^CRV\*/, '').trim();

  return fixedPayee;
}
