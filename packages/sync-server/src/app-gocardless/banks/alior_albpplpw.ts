import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

/**
 * Alior Bank stopped returning `creditorName` on outgoing transactions in
 * early July 2026. For card payments the merchant is still there, behind a
 * fixed prefix, in `remittanceInformationUnstructured`:
 *
 *   "Transakcja kartą debetową, Example Coffee Bar"
 *
 * Without the merchant, `formatPayeeName` walks its fallback chain down to
 * `debtorName`, which on an outgoing transaction is the account holder. Every
 * card payment then gets booked against the account holder instead of the
 * shop.
 *
 * Only card payments are handled here. On the remaining outgoing transactions
 * (transfers, ATM withdrawals, loan instalments) the recipient is not present
 * in the payload at all, so there is nothing better to fall back to.
 *
 * Everything after the first comma is the merchant: Alior truncates that field
 * to 22 characters and appends nothing after it, so there are no further comma
 * separated fields to trip over. Checked against a 90 day window of real card
 * payments: none of the merchant names contained a comma or a line break, and
 * `remittanceInformationUnstructuredArray` was always a single element equal to
 * `remittanceInformationUnstructured`.
 */
const CARD_PAYMENT_MERCHANT = /^Transakcja kartą [^,]+,\s*(.+)$/is;

export default {
  ...Fallback,

  institutionIds: ['ALIOR_ALBPPLPW'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    if (
      Number(transaction.transactionAmount.amount) < 0 &&
      !transaction.creditorName
    ) {
      const remittanceInfo =
        transaction.remittanceInformationUnstructured ?? '';
      const merchant =
        remittanceInfo.match(CARD_PAYMENT_MERCHANT)?.[1].trim() ?? '';

      if (merchant) {
        editedTrans.creditorName = merchant;
      }
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
