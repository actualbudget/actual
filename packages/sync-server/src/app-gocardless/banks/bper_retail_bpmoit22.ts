/**
 * Normalize BPER Retail BPMOIT22 transactions by extracting a friendly payee
 * while keeping the raw description in the notes field.
 */

import type { Transaction } from '#app-gocardless/gocardless-node.types';

import Fallback from './integration-bank';
import type { IBank } from './bank.interface';

const CARD_PAYMENT_PREFIX = 'PAGAMENTO SU CIRCUITO INTERNAZIONALE';
const CARD_PAYMENT_SUFFIX = 'Operazione carta';
const BONIFICO_PREFIX = 'BONIFICO';
const BONIFICO_ESTERI_PREFIX = 'BONIFICI ESTERI';
const SDD_PREFIX = 'ADDEBITO SDD';
const BOLLETTINO_MARKER = 'CREDITORE:';

const BONIFICO_ORIGINATOR_REGEX =
  /o\/c:\s*([A-Z0-9\s.'/&-]+?)(?:ABI|BIC|IBAN|a favore di|Num|EUR|$)/i;
const SDD_PAYEE_REGEX = /ADDEBITO SDD\s+([A-Z0-9\s.'/&-]+?)(?:N:|ID:|$)/i;
const BOLLETTINO_PAYEE_REGEX = /CREDITORE:\s*([A-Z0-9\s.'/&-]+)/i;

// Extract payee for card transactions
function parseCardPayee(description: string) {
  const [beforeSuffix] = description.split(CARD_PAYMENT_SUFFIX);

  return beforeSuffix.replace(CARD_PAYMENT_PREFIX, '').trim();
}

// Extract originator for bonifico (domestic/foreign transfers)
function parseBonificoOriginator(description: string) {
  const match = description.match(BONIFICO_ORIGINATOR_REGEX);

  return match ? match[1].trim() : '';
}

// Extract creditor for SDD direct debits
function parseSddPayee(description: string) {
  const match = description.match(SDD_PAYEE_REGEX);

  return match ? match[1].trim() : '';
}

// Extract creditor for bollettini / utilities
function parseBollettinoPayee(description: string) {
  const match = description.match(BOLLETTINO_PAYEE_REGEX);

  return match ? match[1].trim() : '';
}

function setPayee(editedTransaction: Transaction, payee: string) {
  if (!payee) {
    return;
  }

  editedTransaction.creditorName = payee;
  editedTransaction.debtorName = payee;
}

const BperRetailBank = {
  ...Fallback,

  institutionIds: ['BPER_RETAIL_BPMOIT22'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };
    const description = (
      transaction.remittanceInformationUnstructured || ''
    ).trim();

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
} satisfies IBank;

export default BperRetailBank;
