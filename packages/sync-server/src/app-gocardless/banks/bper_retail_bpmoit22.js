/**
 * BPER Bank Transaction Parser for Actual Budget
 *
 * ⚠️ Why this is needed:
 * -----------------------
 * BPER's GoCardless feed does not return structured payee/beneficiary fields.
 * Instead, *all transaction details* (merchant name, originator, creditor, etc.)
 * are crammed into a single string field: `remittanceInformationUnstructured`.
 *
 * Without preprocessing, Actual shows the full raw string as the payee,
 * which makes the register messy and hard to use.
 *
 * This parser extracts a cleaner `payee` based on the transaction type,
 * while keeping the original description in `memo`.
 *
 * Categories handled:
 *  1. Card payments        → extract merchant name after "PAGAMENTO SU CIRCUITO INTERNAZIONALE"
 *                            and before "Operazione carta"
 *  2. Bonifico transfers   → extract originator after "o/c:"
 *  3. Bonifici esteri      → same as bonifico
 *  4. SDD direct debits    → extract creditor name after "ADDEBITO SDD"
 *  5. Bollettini/Utilities → extract creditor after "CREDITORE:"
 *  6. Other (fees, misc)   → leave description as-is
 */

import Fallback from './integration-bank.js';

const CARD_PAYMENT_PREFIX = 'PAGAMENTO SU CIRCUITO INTERNAZIONALE';
const CARD_PAYMENT_SUFFIX = 'Operazione carta';
const BONIFICO_PREFIX = 'BONIFICO';
const BONIFICO_ESTERI_PREFIX = 'BONIFICI ESTERI';
const SDD_PREFIX = 'ADDEBITO SDD';
const BOLLETTINO_MARKER = 'CREDITORE:';

const PAYEE_CAPTURE = "[A-Z0-9\\s.'\\/&-]+";
const BONIFICO_ORIGINATOR_REGEX = new RegExp(
  `o/c:\\s*(${PAYEE_CAPTURE}?)(?:ABI|BIC|IBAN|a favore di|Num|EUR|$)`,
  'i',
);
const SDD_PAYEE_REGEX = new RegExp(
  `ADDEBITO SDD\\s+(${PAYEE_CAPTURE}?)(?:N:|ID:|$)`,
  'i',
);
const BOLLETTINO_PAYEE_REGEX = new RegExp(
  `CREDITORE:\\s*(${PAYEE_CAPTURE})`,
  'i',
);

/** Extract payee for card transactions */
function parseCardPayee(description) {
  const [beforeSuffix] = description.split(CARD_PAYMENT_SUFFIX);

  return beforeSuffix.replace(CARD_PAYMENT_PREFIX, '').trim();
}

/** Extract originator for bonifico (domestic/foreign transfers) */
function parseBonificoOriginator(description) {
  const match = description.match(BONIFICO_ORIGINATOR_REGEX);

  return match ? match[1].trim() : '';
}

/** Extract creditor for SDD direct debits */
function parseSddPayee(description) {
  const match = description.match(SDD_PAYEE_REGEX);

  return match ? match[1].trim() : '';
}

/** Extract creditor for bollettini / utilities */
function parseBollettinoPayee(description) {
  const match = description.match(BOLLETTINO_PAYEE_REGEX);

  return match ? match[1].trim() : '';
}

function setPayee(editedTransaction, payee) {
  if (!payee) {
    return;
  }

  editedTransaction.creditorName = payee;
  editedTransaction.debtorName = payee;
}

/**
 * Main parser exported to Actual.
 * Maps a raw GoCardless BPER transaction into Actual's format.
 */
/** @type {import('./bank.interface.js').IBank} */
const BperRetailBank = {
  ...Fallback,

  institutionIds: ['BPER_RETAIL_BPMOIT22'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };
    const description = (transaction.remittanceInformationUnstructured || '').trim();

    if (description) {
      editedTrans.remittanceInformationUnstructured = description;
    }

    let payee = '';

    if (description.startsWith(CARD_PAYMENT_PREFIX)) {
      payee = parseCardPayee(description);
    } else if (
      description.startsWith(BONIFICO_PREFIX) ||
      description.startsWith(BONIFICO_ESTERI_PREFIX)
    ) {
      payee = parseBonificoOriginator(description);
    } else if (description.startsWith(SDD_PREFIX)) {
      payee = parseSddPayee(description);
    } else if (description.includes(BOLLETTINO_MARKER)) {
      payee = parseBollettinoPayee(description);
    }

    setPayee(editedTrans, payee);

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};

export default BperRetailBank;
