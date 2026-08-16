import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

/**
 * Alior Bank stopped returning `creditorName` on outgoing transactions in
 * early July 2026. For card payments the merchant is still there, behind a
 * fixed prefix, in `remittanceInformationUnstructured`:
 *
 *   "Transakcja kartą debetową, Grycan Lodziarnie Firm"
 *
 * Without the merchant, `formatPayeeName` walks its fallback chain down to
 * `debtorName`, which on an outgoing transaction is the account holder. Every
 * card payment then gets booked against the account holder instead of the
 * shop.
 *
 * Only card payments are handled here. On the remaining outgoing transactions
 * (transfers, ATM withdrawals, loan instalments) the recipient is not present
 * in the payload at all, so there is nothing better to fall back to.
 */
const CARD_PAYMENT_PREFIX = /^Transakcja kartą [^,]+,\s*/i;

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
      const merchant = CARD_PAYMENT_PREFIX.test(remittanceInfo)
        ? remittanceInfo.replace(CARD_PAYMENT_PREFIX, '').trim()
        : '';

      if (merchant) {
        editedTrans.creditorName = merchant;
      }
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
